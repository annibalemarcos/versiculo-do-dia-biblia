package com.example.data.repository

import com.example.data.remote.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class SupportRepository(
    private val apiService: BibleApiService
) {
    private fun parseApiError(rawError: String?, defaultMsg: String): String {
        if (rawError.isNullOrBlank()) return defaultMsg
        return try {
            val json = org.json.JSONObject(rawError)
            if (json.has("error")) {
                val errObj = json.optJSONObject("error")
                errObj?.optString("message") ?: json.optString("error", defaultMsg)
            } else if (json.has("detail")) {
                json.optString("detail", defaultMsg)
            } else if (json.has("message")) {
                json.optString("message", defaultMsg)
            } else {
                defaultMsg
            }
        } catch (_: Exception) {
            defaultMsg
        }
    }

    suspend fun createTicket(
        subject: String,
        description: String,
        category: String,
        priority: String = "NORMAL",
        guestName: String? = null,
        guestEmail: String? = null
    ): Result<TicketDetailDto> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.createSupportTicket(
                TicketCreateRequest(
                    subject = subject,
                    description = description,
                    category = category,
                    priority = priority,
                    guestName = guestName,
                    guestEmail = guestEmail
                )
            )

            if (response.isSuccessful && response.body()?.data != null) {
                Result.success(response.body()!!.data!!)
            } else {
                val rawError = response.errorBody()?.string()
                val errorMsg = parseApiError(rawError, "Erro ao abrir chamado (${response.code()})")
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            android.util.Log.d("SupportRepository", "createTicket error: ${e.message}", e)
            val msg = if (e is java.io.IOException) "Falha de conexão com o servidor. Tente novamente." else "Não foi possível processar a resposta do servidor."
            Result.failure(Exception(msg))
        }
    }

    suspend fun getMyTickets(page: Int = 1, limit: Int = 30): Result<List<TicketItemDto>> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getMySupportTickets(page = page, limit = limit)
            if (response.isSuccessful && response.body()?.data != null) {
                Result.success(response.body()!!.data ?: emptyList())
            } else {
                val rawError = response.errorBody()?.string()
                val errorMsg = parseApiError(rawError, "Erro ao obter chamados (${response.code()})")
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getTicketDetail(ticketId: String): Result<TicketDetailDto> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getSupportTicketDetail(ticketId)
            if (response.isSuccessful && response.body()?.data != null) {
                Result.success(response.body()!!.data!!)
            } else {
                val rawError = response.errorBody()?.string()
                val errorMsg = parseApiError(rawError, "Erro ao obter detalhes do chamado")
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun replyToTicket(ticketId: String, message: String): Result<TicketMessageDto> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.replySupportTicket(
                ticketId = ticketId,
                request = TicketMessageCreateRequest(message = message, isInternalNote = false)
            )
            if (response.isSuccessful && response.body()?.data != null) {
                Result.success(response.body()!!.data!!)
            } else {
                val rawError = response.errorBody()?.string()
                val errorMsg = parseApiError(rawError, "Erro ao enviar resposta")
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
