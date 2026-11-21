package com.notifyiq

internal enum class NotificationCategory(val wireValue: String) {
  PERSONAL("personal"), FINANCE("finance"), DELIVERY_SHOPPING("delivery_shopping"),
  TRAVEL("travel"), SOCIAL("social"), PROMOTION("promotion"),
  REMINDER_CALENDAR("reminder_calendar"), SYSTEM("system"), OTHER("other");

  companion object {
    fun fromWireValue(value: String): NotificationCategory? = entries.firstOrNull { it.wireValue == value }
  }
}

internal data class NotificationAnalysis(
  val category: NotificationCategory,
  val priority: String,
  val confidence: Double,
  val explanation: String,
  val method: String = METHOD,
  val version: String = VERSION,
) {
  companion object {
    const val METHOD = "deterministic_rules"
    const val VERSION = "rules_v1"
  }
}

/** Applies only to content that has already passed the sensitive-content gate. */
internal object NotificationAnalyzer {
  private data class CategoryRule(val category: NotificationCategory, val pattern: Regex, val explanation: String)

  private val categoryRules = listOf(
    CategoryRule(NotificationCategory.FINANCE, Regex("\\b(transaction|payment|paid|credited|debited|balance|statement|invoice|upi|bank|card ending)\\b|भुगतान|जमा|निकासी|बैंक|लेनदेन|यूपीआई", RegexOption.IGNORE_CASE), "Matched a finance-related term."),
    CategoryRule(NotificationCategory.TRAVEL, Regex("\\b(flight|boarding|train|platform|gate|itinerary|hotel booking|reservation|trip)\\b|उड़ान|फ्लाइट|बोर्डिंग|ट्रेन|प्लेटफॉर्म|यात्रा", RegexOption.IGNORE_CASE), "Matched a travel-related term."),
    CategoryRule(NotificationCategory.DELIVERY_SHOPPING, Regex("\\b(delivery|delivered|shipment|tracking|order|parcel|out for delivery|refund)\\b|डिलीवरी|डिलीवर|पार्सल|ऑर्डर|कूरियर|पहुंच गया", RegexOption.IGNORE_CASE), "Matched a shopping or delivery term."),
    CategoryRule(NotificationCategory.REMINDER_CALENDAR, Regex("\\b(reminder|calendar|meeting|appointment|event starts)\\b|रिमाइंडर|याद दिलाना|कैलेंडर|बैठक|अपॉइंटमेंट", RegexOption.IGNORE_CASE), "Matched a reminder or calendar term."),
    CategoryRule(NotificationCategory.SOCIAL, Regex("\\b(liked your|commented on|new follower|mentioned you|new post)\\b|पसंद किया|टिप्पणी|फॉलो किया|नई पोस्ट", RegexOption.IGNORE_CASE), "Matched a social activity term."),
    CategoryRule(NotificationCategory.PROMOTION, Regex("\\b(promotion|sale|discount|deal|coupon|special offer|limited time offer)\\b|छूट|कूपन|विशेष ऑफर|सेल", RegexOption.IGNORE_CASE), "Matched a promotion term."),
    CategoryRule(NotificationCategory.SYSTEM, Regex("\\b(system update|software update|battery low|storage almost full|permission request|security update)\\b|सिस्टम अपडेट|सॉफ्टवेयर अपडेट|बैटरी कम|स्टोरेज|अनुमति अनुरोध|सुरक्षा अपडेट", RegexOption.IGNORE_CASE), "Matched a device or system notice."),
    CategoryRule(NotificationCategory.PERSONAL, Regex("\\b(message from|new message|missed call|voicemail|sent you a message)\\b|नया संदेश|मैसेज|मिस्ड कॉल|वॉइसमेल", RegexOption.IGNORE_CASE), "Matched a personal communication term."),
  )
  private val urgentPattern = Regex("\\b(emergency alert|immediate danger|sos|severe weather warning|critical security alert)\\b|आपातकालीन चेतावनी|तत्काल खतरा", RegexOption.IGNORE_CASE)
  private val highPattern = Regex("\\b(payment failed|fraud alert|suspicious sign.?in|flight boarding|appointment starts in|due today)\\b|भुगतान विफल|धोखाधड़ी चेतावनी|उड़ान की बोर्डिंग|आज देय", RegexOption.IGNORE_CASE)
  private val lowPattern = Regex("\\b(promotion|sale|discount|coupon|special offer|limited time offer)\\b|छूट|कूपन|विशेष ऑफर|सेल", RegexOption.IGNORE_CASE)
  private val negationPattern = Regex("\\b(no|not|never|without|isn't)\\b|नहीं", RegexOption.IGNORE_CASE)

  fun analyze(title: String?, body: String?, subtext: String?): NotificationAnalysis {
    val text = listOfNotNull(title, body, subtext).joinToString(" ")
    val categoryRule = categoryRules.firstOrNull { it.pattern.containsMatchIn(text) }
    val priority = when {
      hasUnnegatedMatch(urgentPattern, text) -> Triple("urgent", 0.9, "Matched an explicit emergency phrase.")
      hasUnnegatedMatch(highPattern, text) -> Triple("high", 0.8, "Matched an explicit time-sensitive phrase.")
      hasUnnegatedMatch(lowPattern, text) -> Triple("low", 0.8, "Matched a promotion phrase.")
      else -> Triple("normal", 0.0, "No high-confidence priority rule matched.")
    }
    return NotificationAnalysis(
      category = categoryRule?.category ?: NotificationCategory.OTHER,
      priority = priority.first,
      confidence = categoryRule?.let { 0.82 } ?: 0.0,
      explanation = listOfNotNull(categoryRule?.explanation, priority.third).joinToString(" "),
    )
  }

  private fun hasUnnegatedMatch(pattern: Regex, text: String): Boolean = pattern.findAll(text).any { match ->
    val precedingText = text.substring((match.range.first - 28).coerceAtLeast(0), match.range.first)
    !negationPattern.containsMatchIn(precedingText)
  }
}
