package com.notifyiq

internal data class NotificationIdentity(
  val packageName: String,
  val notificationKey: String,
)

internal data class CapturedNotification(
  val identity: NotificationIdentity,
  val title: String?,
  val body: String?,
  val subtext: String?,
  val postedAt: Long,
  val receivedAt: Long,
)

data class NotificationRecord(
  val id: Long,
  val packageName: String,
  val title: String?,
  val body: String?,
  val subtext: String?,
  val postedAt: Long,
  val receivedAt: Long,
  val removedAt: Long?,
  val saved: Boolean,
  val archivedAt: Long?,
  val category: String,
  val priority: String,
  val confidence: Double,
  val analysisExplanation: String,
  val analysisMethod: String,
  val analysisVersion: String,
  val categoryOverride: String?,
  val duplicateGroupId: Long?,
  val duplicateCount: Int,
  val includeInDigest: Boolean? = null,
  val important: Boolean? = null,
  val ruleGroups: List<String> = emptyList(),
  val matchedRuleIds: List<String> = emptyList(),
  val reminderDueAt: Long? = null,
  val reminderStatus: String? = null,
)

internal data class OverviewCount(val label: String, val count: Int)

internal data class DailyOverviewResult(
  val dayStart: Long,
  val dayEnd: Long,
  val totalCount: Int,
  val appCount: Int,
  val categories: List<OverviewCount>,
  val apps: List<OverviewCount>,
  val hours: List<OverviewCount>,
  val sources: List<NotificationRecord>,
)

internal data class MoneyRow(
  val eventId: Long, val amountMinor: Long, val currency: String, val direction: String, val merchant: String?,
  val category: String, val receivedAt: Long, val packageName: String, val subscription: Boolean,
)

internal data class MoneyBucket(val label: String, val amountMinor: Long, val count: Int)

internal data class MoneySummary(
  val from: Long, val to: Long, val currency: String, val spentMinor: Long, val receivedMinor: Long,
  val debitCount: Int, val creditCount: Int, val merchants: List<MoneyBucket>, val categories: List<MoneyBucket>,
  val recent: List<MoneyRow>, val otherCurrencies: List<String>,
)

internal data class UpcomingAction(
  val eventId: Long, val kind: String, val dueAt: Long, val hasTime: Boolean, val amountMinor: Long?, val currency: String?,
  val reminderAt: Long?, val reminderStatus: String?, val merchant: String?, val packageName: String, val title: String?,
  val body: String?, val receivedAt: Long,
)

internal data class RecurringPayment(
  val merchant: String, val amountMinor: Long, val currency: String, val cadence: String, val lastPaidAt: Long,
  val nextExpectedAt: Long?, val occurrences: Int,
)
