package com.example.data.local.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "verses")
data class VerseEntity(
    @PrimaryKey val id: String,
    val bookName: String,
    val chapter: Int,
    val verseNumber: Int,
    val text: String,
    val translation: String = "NVI",
    val theme: String = "",
    val emotion: String = "",
    val reflection: String = "",
    val isDaily: Boolean = false,
    val dateStr: String? = null
)

@Entity(tableName = "daily_verses")
data class DailyVerseEntity(
    @PrimaryKey val dateStr: String,
    val verseId: String,
    val reference: String,
    val text: String,
    val translation: String,
    val reflection: String,
    val theme: String,
    val emotion: String = "",
    val isFavorite: Boolean = false,
    val cachedAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "favorites",
    primaryKeys = ["verseId", "userId"]
)
data class FavoriteEntity(
    val verseId: String,
    val userId: String = "guest",
    val reference: String,
    val text: String,
    val translation: String,
    val reflection: String = "",
    val theme: String = "",
    val savedAt: Long = System.currentTimeMillis(),
    val isSynced: Boolean = false
)

@Entity(tableName = "reading_history")
data class HistoryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val userId: String = "guest",
    val verseId: String,
    val reference: String,
    val text: String,
    val translation: String,
    val source: String = "home",
    val viewedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "devotionals")
data class DevotionalEntity(
    @PrimaryKey val id: String,
    val title: String,
    val description: String,
    val author: String = "Equipe Bíblia Diária",
    val coverUrl: String = "",
    val totalDays: Int = 7,
    val currentDay: Int = 1,
    val isCompleted: Boolean = false,
    val isPremium: Boolean = false,
    val category: String = "Vida Cristã"
)

@Entity(tableName = "devotional_days")
data class DevotionalDayEntity(
    @PrimaryKey val id: String,
    val devotionalId: String,
    val dayNumber: Int,
    val title: String,
    val scriptureRef: String,
    val scriptureText: String,
    val reflection: String,
    val prayer: String,
    val isCompleted: Boolean = false
)

@Entity(tableName = "themes")
data class ThemeEntity(
    @PrimaryKey val id: String,
    val name: String,
    val iconName: String = "favorite",
    val description: String = "",
    val verseCount: Int = 0
)

@Entity(tableName = "emotions")
data class EmotionEntity(
    @PrimaryKey val id: String,
    val name: String,
    val emoji: String = "🕊️",
    val description: String = "",
    val comfortingWord: String = ""
)

@Entity(tableName = "sync_queue")
data class SyncQueueEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val userId: String = "guest",
    val entityType: String = "favorite", // "favorite", "history", "ticket", "message", "preference"
    val entityId: String = "",
    val operation: String = "UPSERT", // "UPSERT", "DELETE"
    val actionType: String = "", // e.g. "ADD_FAVORITE", "REMOVE_FAVORITE"
    val payloadJson: String = "",
    val createdAt: Long = System.currentTimeMillis(),
    val retryCount: Int = 0,
    val lastError: String? = null,
    val syncStatus: String = "PENDING" // "PENDING", "IN_PROGRESS", "FAILED", "COMPLETED"
)

@Entity(tableName = "support_tickets")
data class TicketEntity(
    @PrimaryKey val id: String,
    val userId: String = "guest",
    val title: String,
    val status: String = "open", // open, in_progress, resolved, closed
    val priority: String = "normal",
    val createdAt: String = "",
    val updatedAt: String = ""
)

@Entity(tableName = "support_messages")
data class TicketMessageEntity(
    @PrimaryKey val id: String,
    val ticketId: String,
    val senderType: String = "user", // "user", "agent", "system"
    val senderName: String = "Você",
    val message: String,
    val createdAt: String = "",
    val isLocalPending: Boolean = false
)

@Entity(tableName = "sync_metadata")
data class SyncMetadataEntity(
    @PrimaryKey val key: String,
    val value: String,
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "notifications")
data class NotificationEntity(
    @PrimaryKey val id: String,
    val userId: String = "guest",
    val title: String,
    val message: String,
    val type: String = "system",
    val deepLink: String? = null,
    val isRead: Boolean = false,
    val createdAt: String = "",
    val receivedAt: Long = System.currentTimeMillis()
)

