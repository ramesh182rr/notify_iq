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
