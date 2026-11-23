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
  val categoryEdited: Boolean = false,
  /** Other apps that reported this same payment; counted once. */
  val alsoFrom: List<String> = emptyList(),
  val fingerprint: String? = null,
  /** Who sent it inside the app (SMS sender or chat name); separates a bank SMS from a UPI SMS in one SMS app. */
  val sender: String? = null,
  /** How many other alerts reported this same payment. */
  val mergedCount: Int = 0,
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
  val recurrence: String? = null, val approximate: Boolean = false,
)

internal data class RecurringPayment(
  val merchant: String, val amountMinor: Long, val currency: String, val cadence: String, val lastPaidAt: Long,
  val nextExpectedAt: Long?, val occurrences: Int,
)

internal data class MoneyCategoryBreakdown(val category: String, val amountMinor: Long, val count: Int, val topMerchants: List<MoneyBucket>)

internal data class MoneyDay(val dayStart: Long, val outMinor: Long, val inMinor: Long)

internal data class MoneyAnalytics(
  val from: Long, val to: Long, val currency: String, val spentMinor: Long, val receivedMinor: Long,
  val debitCount: Int, val creditCount: Int, val previousSpentMinor: Long, val previousReceivedMinor: Long,
  val spendCategories: List<MoneyCategoryBreakdown>, val incomeCategories: List<MoneyCategoryBreakdown>,
  val daily: List<MoneyDay>, val weekdays: List<MoneyBucket>, val dayparts: List<MoneyBucket>,
  val topMerchants: List<MoneyBucket>, val topSources: List<MoneyBucket>,
  val biggest: MoneyRow?, val busiestDay: MoneyDay?, val mostFrequent: MoneyBucket?, val smallSpends: MoneyBucket,
  val weekendShare: Double, val projectedMonthSpentMinor: Long?, val recent: List<MoneyRow>, val otherCurrencies: List<String>,
)

internal data class AppDirectoryEntry(val packageName: String, val label: String, val iconFile: String?)
