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
)
