package com.example.data.local.db

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.RoomDatabase
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface VerseDao {
    @Query("SELECT * FROM verses WHERE id = :id")
    suspend fun getVerseById(id: String): VerseEntity?

    @Query("SELECT * FROM verses WHERE theme = :theme ORDER BY id ASC")
    fun getVersesByTheme(theme: String): Flow<List<VerseEntity>>

    @Query("SELECT * FROM verses WHERE emotion = :emotion ORDER BY id ASC")
    fun getVersesByEmotion(emotion: String): Flow<List<VerseEntity>>

    @Query("SELECT * FROM verses WHERE text LIKE '%' || :query || '%' OR bookName LIKE '%' || :query || '%' OR theme LIKE '%' || :query || '%'")
    fun searchVerses(query: String): Flow<List<VerseEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertVerses(verses: List<VerseEntity>)

    @Query("SELECT COUNT(*) FROM verses")
    suspend fun getCount(): Int
}

@Dao
interface DailyVerseDao {
    @Query("SELECT * FROM daily_verses ORDER BY dateStr DESC LIMIT 1")
    fun getLatestDailyVerse(): Flow<DailyVerseEntity?>

    @Query("SELECT * FROM daily_verses ORDER BY dateStr DESC LIMIT 1")
    suspend fun getLatestDailyVerseDirect(): DailyVerseEntity?

    @Query("SELECT * FROM daily_verses WHERE dateStr = :dateStr")
    suspend fun getDailyVerseByDate(dateStr: String): DailyVerseEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertDailyVerse(dailyVerse: DailyVerseEntity)
}

@Dao
interface FavoriteDao {
    @Query("SELECT * FROM favorites WHERE userId = :userId ORDER BY savedAt DESC")
    fun getAllFavorites(userId: String): Flow<List<FavoriteEntity>>

    @Query("SELECT * FROM favorites WHERE userId = :userId ORDER BY savedAt DESC")
    suspend fun getAllFavoritesList(userId: String): List<FavoriteEntity>

    @Query("SELECT * FROM favorites WHERE userId = :userId AND isSynced = 0")
    suspend fun getUnsyncedFavorites(userId: String): List<FavoriteEntity>

    @Query("UPDATE favorites SET isSynced = 1 WHERE verseId = :verseId AND userId = :userId")
    suspend fun markFavoriteSynced(verseId: String, userId: String)

    @Query("SELECT EXISTS(SELECT 1 FROM favorites WHERE verseId = :verseId AND userId = :userId)")
    fun isFavorite(verseId: String, userId: String): Flow<Boolean>

    @Query("SELECT EXISTS(SELECT 1 FROM favorites WHERE verseId = :verseId AND userId = :userId)")
    suspend fun isFavoriteDirect(verseId: String, userId: String): Boolean

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertFavorite(favorite: FavoriteEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertFavorites(favorites: List<FavoriteEntity>)

    @Query("DELETE FROM favorites WHERE verseId = :verseId AND userId = :userId")
    suspend fun deleteFavorite(verseId: String, userId: String)

    @Query("DELETE FROM favorites WHERE userId = :userId")
    suspend fun clearUserFavorites(userId: String)

    @Query("DELETE FROM favorites")
    suspend fun clearAll()
}

@Dao
interface HistoryDao {
    @Query("SELECT * FROM reading_history WHERE userId = :userId ORDER BY viewedAt DESC LIMIT 50")
    fun getRecentHistory(userId: String): Flow<List<HistoryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertHistory(history: HistoryEntity)

    @Query("DELETE FROM reading_history WHERE userId = :userId")
    suspend fun clearHistory(userId: String)

    @Query("DELETE FROM reading_history")
    suspend fun clearAll()
}

@Dao
interface DevotionalDao {
    @Query("SELECT * FROM devotionals ORDER BY id ASC")
    fun getAllDevotionals(): Flow<List<DevotionalEntity>>

    @Query("SELECT * FROM devotionals WHERE id = :id")
    suspend fun getDevotionalById(id: String): DevotionalEntity?

    @Query("SELECT * FROM devotional_days WHERE devotionalId = :devotionalId ORDER BY dayNumber ASC")
    fun getDaysForDevotional(devotionalId: String): Flow<List<DevotionalDayEntity>>

    @Query("SELECT * FROM devotional_days WHERE devotionalId = :devotionalId AND dayNumber = :dayNumber")
    suspend fun getDay(devotionalId: String, dayNumber: Int): DevotionalDayEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertDevotionals(devotionals: List<DevotionalEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertDays(days: List<DevotionalDayEntity>)

    @Update
    suspend fun updateDevotional(devotional: DevotionalEntity)

    @Query("UPDATE devotional_days SET isCompleted = :completed WHERE id = :dayId")
    suspend fun setDayCompleted(dayId: String, completed: Boolean)

    @Query("UPDATE devotionals SET currentDay = :currentDay, isCompleted = :isCompleted WHERE id = :devotionalId")
    suspend fun updateDevotionalProgress(devotionalId: String, currentDay: Int, isCompleted: Boolean)
}

@Dao
interface ThemeEmotionDao {
    @Query("SELECT * FROM themes ORDER BY name ASC")
    fun getAllThemes(): Flow<List<ThemeEntity>>

    @Query("SELECT * FROM emotions ORDER BY name ASC")
    fun getAllEmotions(): Flow<List<EmotionEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertThemes(themes: List<ThemeEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEmotions(emotions: List<EmotionEntity>)
}

@Dao
interface SyncQueueDao {
    @Query("SELECT * FROM sync_queue WHERE userId = :userId OR userId = 'guest' ORDER BY createdAt ASC")
    suspend fun getAllPending(userId: String): List<SyncQueueEntity>

    @Query("SELECT COUNT(*) FROM sync_queue WHERE userId = :userId OR userId = 'guest'")
    fun getPendingCount(userId: String): Flow<Int>

    @Query("SELECT COUNT(*) FROM sync_queue WHERE userId = :userId OR userId = 'guest'")
    suspend fun getPendingCountDirect(userId: String): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSyncItem(item: SyncQueueEntity)

    @Query("UPDATE sync_queue SET syncStatus = :status, retryCount = :retryCount, lastError = :lastError WHERE id = :id")
    suspend fun updateSyncItemStatus(id: Long, status: String, retryCount: Int, lastError: String?)

    @Query("DELETE FROM sync_queue WHERE id = :id")
    suspend fun deleteSyncItem(id: Long)

    @Query("DELETE FROM sync_queue WHERE userId = :userId")
    suspend fun clearUserQueue(userId: String)
}

@Dao
interface TicketDao {
    @Query("SELECT * FROM support_tickets WHERE userId = :userId ORDER BY updatedAt DESC")
    fun getTickets(userId: String): Flow<List<TicketEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTickets(tickets: List<TicketEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTicket(ticket: TicketEntity)

    @Query("SELECT * FROM support_messages WHERE ticketId = :ticketId ORDER BY createdAt ASC")
    fun getMessages(ticketId: String): Flow<List<TicketMessageEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessages(messages: List<TicketMessageEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessage(message: TicketMessageEntity)
}

@Dao
interface SyncMetadataDao {
    @Query("SELECT value FROM sync_metadata WHERE `key` = :key")
    suspend fun getMetadata(key: String): String?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun setMetadata(metadata: SyncMetadataEntity)
}

@Dao
interface NotificationDao {
    @Query("SELECT * FROM notifications WHERE userId = :userId OR userId = 'guest' ORDER BY receivedAt DESC")
    fun getAllNotifications(userId: String): Flow<List<NotificationEntity>>

    @Query("SELECT COUNT(*) FROM notifications WHERE (userId = :userId OR userId = 'guest') AND isRead = 0")
    fun getUnreadCount(userId: String): Flow<Int>

    @Query("SELECT COUNT(*) FROM notifications WHERE (userId = :userId OR userId = 'guest') AND isRead = 0")
    suspend fun getUnreadCountDirect(userId: String): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertNotifications(notifications: List<NotificationEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertNotification(notification: NotificationEntity)

    @Query("UPDATE notifications SET isRead = 1 WHERE id = :id")
    suspend fun markAsRead(id: String)

    @Query("UPDATE notifications SET isRead = 1 WHERE userId = :userId OR userId = 'guest'")
    suspend fun markAllAsRead(userId: String)

    @Query("DELETE FROM notifications WHERE id = :id")
    suspend fun deleteNotification(id: String)

    @Query("DELETE FROM notifications WHERE userId = :userId")
    suspend fun clearUserNotifications(userId: String)

    @Query("DELETE FROM notifications")
    suspend fun clearAll()
}

@Database(
    entities = [
        VerseEntity::class,
        DailyVerseEntity::class,
        FavoriteEntity::class,
        HistoryEntity::class,
        DevotionalEntity::class,
        DevotionalDayEntity::class,
        ThemeEntity::class,
        EmotionEntity::class,
        SyncQueueEntity::class,
        NotificationEntity::class,
        TicketEntity::class,
        TicketMessageEntity::class,
        SyncMetadataEntity::class
    ],
    version = 4,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun verseDao(): VerseDao
    abstract fun dailyVerseDao(): DailyVerseDao
    abstract fun favoriteDao(): FavoriteDao
    abstract fun historyDao(): HistoryDao
    abstract fun devotionalDao(): DevotionalDao
    abstract fun themeEmotionDao(): ThemeEmotionDao
    abstract fun syncQueueDao(): SyncQueueDao
    abstract fun notificationDao(): NotificationDao
    abstract fun ticketDao(): TicketDao
    abstract fun syncMetadataDao(): SyncMetadataDao
}
