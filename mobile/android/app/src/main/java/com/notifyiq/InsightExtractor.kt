package com.notifyiq

import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId

internal enum class MoneyDirection(val wire: String) { DEBIT("debit"), CREDIT("credit") }

internal enum class ActionKind(val wire: String) {
  BILL_DUE("bill_due"), SUBSCRIPTION_RENEWAL("subscription_renewal"), EXPIRY("expiry"), APPOINTMENT("appointment"), TASK("task"),
}

internal data class MoneyEvent(
  val amountMinor: Long,
  val currency: String,
  val direction: MoneyDirection,
  val merchant: String?,
  val channel: String?,
  val spendCategory: String,
)

internal data class ActionItem(
  val kind: ActionKind,
  val dueAt: Long,
  val hasTime: Boolean,
  val amountMinor: Long?,
  val currency: String?,
)

internal data class NotificationInsight(
  val money: MoneyEvent?,
  val action: ActionItem?,
  val subscription: Boolean,
  val evidence: String,
) {
  val isEmpty: Boolean get() = money == null && action == null
}

/**
 * Deterministic, local extraction of money movements and dated actions from notification text.
 *
 * Design goal is precision over recall: when a message is ambiguous (balances, limits, offers,
 * failed or future payments, minimum-due lines) nothing is extracted rather than a wrong value.
 * Runs only on text that already passed the sensitive-content gate. Version changes must bump
 * [VERSION] so stored results can be recomputed.
 */
internal object InsightExtractor {
  const val VERSION = 3

  private val I = setOf(RegexOption.IGNORE_CASE)

  // ---- amounts ---------------------------------------------------------------------------
  private const val NUM = """[0-9]{1,3}(?:,[0-9]{2,3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?"""
  private val AMOUNT = Regex(
    """(?:(?<![A-Za-z])(₹|rs\.?|inr|usd|us\$|\$|eur|€|£|gbp)\s?($NUM)(?![0-9])|(?<![0-9.,])($NUM)\s?(rupees|rs\.?|inr|/-|रुपये|रु\.?)(?![A-Za-z]))""",
    I,
  )
  private val NON_SPEND_BEFORE = Regex(
    """(?:\bbal\b|balance|\bavl\b|available|limit|min(?:imum)?\.?\s*(?:amt\.?|amount)?\s*due|\bmin\.?\s*amt|up\s?to|worth|save|earn|\bwin\b|reward|cashback of up|eligible|pre-?approved|loan of|offer of|शेष|बैलेंस)[^0-9₹$€£]{0,12}$""",
    I,
  )
  private val NON_SPEND_AFTER = Regex("""^\s*(?:%|off\b|cashback\b|discount\b|or more\b|\+ cashback)""", I)

  // ---- intent markers -------------------------------------------------------------------
  private val PROMO = Regex(
    """\b(?:offer|sale\b|coupon|use code|promo|discount|% off|flat \d|shop now|deal\b|lowest price|limited time|hurry|apply now|pre-?approved|eligible for|win\b|grab\b|exclusive|upgrade now|save\s*(?:₹|rs\.?|inr|up to|\d)|cash on delivery)\b""",
    I,
  )
  private val FAILED = Regex(
    """\b(?:failed|declined|unsuccessful|(?:could ?n[o']?t|unable to|we couldn't) (?:process|complete)|could not be (?:processed|completed)|was not (?:processed|successful)|rejected|insufficient (?:funds|balance)|has been cancelled|is cancelled)\b|विफल|असफल""",
    I,
  )
  private val NOT_YET = Regex(
    """\b(?:(?:will|you'll|you will|shall) be (?:debited|charged|deducted|auto-?debited|paid|credited|refunded)|to be (?:paid|debited|charged)|after (?:that|the trial|trial)|per month after|/month after|is due|due (?:on|by|date|today|tomorrow|in)|payment due|pay (?:by|before|now)|requested|request(?:ed)? (?:of|for)|collect request|payment request|is scheduled|scheduled (?:for|on)|upcoming|to avoid|kindly pay|please pay|last date|reminder)\b|देय""",
    I,
  )
  private val DEBIT_VERB = Regex(
    """\b(?:debited|spent|paid|sent|withdrawn|withdrawal|purchase|purchased|charged|deducted|auto-?debited|txn of|transaction of|payment of|transferred|was used for|used at|recharge (?:of|done|successful)|payment (?:was |is )?successful|successfully paid|for using your (?:\w+ )?card|using your (?:\w+ )?card .{0,20}for|recharge .{0,24}successful|kat gaye|kat gaya|kate gaye|bheje|bheja)\b|डेबिट|कटे|काटे|कट गए|भुगतान किया|भेजे""",
    I,
  )
  private val CREDIT_VERB = Regex(
    """\b(?:(?!aap)[a-z]+ ne\b.{0,24}\b(?:bheje|bheja|diye|transfer kiye)|(?:have |has )?received (?:a )?payment of|payment received|credited with|credited|received|refund|refunded|reversed|deposited|paid you|sent you|has sent|cashback credited|jama|mile|mila)\b|क्रेडिट|जमा|प्राप्त""",
    I,
  )
  // "…debited from A/c X and credited to ramesh@upi" names the counterparty, not the user.
  private val COUNTERPARTY_CREDIT = Regex("""credited to\s+(?:vpa\s+)?[\w.\-]+@[\w.]+|credited to (?:beneficiary|payee|merchant)""", I)

  // ---- merchants -------------------------------------------------------------------------
  private val MERCHANT_DEBIT = Regex(
    """(?=\b(?:paid to|sent to|at|to|towards|for|info:?)\s+(?:vpa\s+|merchant\s+)?([A-Za-z0-9][A-Za-z0-9&'._@\-]*(?:\s+[A-Za-z0-9&'._@\-]+){0,4}))""",
    I,
  )
  private val MERCHANT_CREDIT = Regex(
    """(?=\b(?:from|by)\s+(?:vpa\s+)?([A-Za-z0-9][A-Za-z0-9&'._@\-]*(?:\s+[A-Za-z0-9&'._@\-]+){0,4}))""",
    I,
  )
  private val NAME_SENT_YOU = Regex("""(?:^|[.!:]\s*)([A-Z][a-z]+(?: [A-Z][a-z]+)?) (?:sent you|paid you|has sent you)""")
  private val HINDI_KO = Regex("""\b([A-Za-z][\w&]+(?: [A-Za-z][\w&]+)?) ko (?:payment|bheje|paid|diye)""", RegexOption.IGNORE_CASE)
  private val YOUR_SUBSCRIPTION = Regex("""\b[Yy]our ([A-Z][\w+]*(?: [A-Z][\w+]*){0,2}) (?:subscription|membership|plan)\b""")
  private val MASKED = Regex("""(?i).*\d.*[x*]{2,}.*|.*[x*]{2,}.*\d.*""")
  private val MERCHANT_STOP = setOf(
    "on", "via", "using", "ref", "refno", "ref.", "upi", "txn", "avl", "bal", "a/c", "ac", "acct", "from", "for", "with", "at", "info",
    "if", "not", "call", "dt", "date", "time", "is", "has", "was", "and", "your", "you", "the", "of", "in", "by", "to", "rs", "rs.", "inr",
    "-", "&", "towards", "successfully", "today", "yesterday", "now", "ending", "card", "account", "bank", "neft", "imps", "rtgs",
    "received", "successful", "done", "completed", "thank", "membership", "subscription", "plan", "bill", "premium", "purchase",
    "order", "payment", "recharge", "ride", "trip", "booking", "charges", "ko", "was", "storage", "annual", "monthly",
  )
  private val MERCHANT_REJECT_FIRST = setOf(
    "your", "a/c", "ac", "acct", "account", "card", "you", "rs", "rs.", "inr", "the", "a", "an", "this", "my", "our", "avl", "bal",
    "credit", "debit", "savings", "upi", "bank", "wallet", "beneficiary",
  )


  // ---- actions ---------------------------------------------------------------------------
  private val SUB_STRONG = Regex("""\b(?:subscription|membership|auto-?pay|autopay|auto-?renew\w*|auto-?debit\w*|e-?mandate|mandate|standing instruction)\b.{0,60}\b(?:renew\w*|will be (?:charged|debited)|charged|debit\w*|next|billing)\b|\b(?:renews|will renew|renewal (?:date|on)|next billing|next renewal|billing date|free trial ends|trial ends)\b|\bwill be (?:charged|debited)\b.{0,60}\b(?:subscription|membership|mandate)\b""", I)
  private val SUB_KW = Regex("""\b(?:subscription|membership|renew(?:al|s|ed)?|auto-?pay|autopay|auto-?debit|e-?mandate|mandate|standing instruction|next billing|billing cycle)\b""", I)
  private val SUB_DONE = Regex("""\b(?:renewed|has been charged|was charged|charged successfully|payment (?:of .{0,25})?(?:successful|received)|subscription (?:is )?active)\b""", I)
  private val BILL_KW = Regex("""\b(?:bill|due date|payment due|amount due|total due|pay by|emi|premium|outstanding|statement (?:is )?(?:generated|ready)|property tax|fees? (?:of|due)|to be paid by)\b|\bpay\b.{0,40}\b(?:by|before)\b|\bwill be debited\b|देय|बिल""", I)
  private val DUE_GENERIC = Regex("""\b(?:is due|due (?:on|by|today|tomorrow|in|hai)|last date)\b""", I)
  private val EXPIRY_KW = Regex("""\b(?:expir(?:e|es|ed|ing|y)|valid (?:till|until|upto|up to)|validity (?:ends|ending|expires|will end)|will lapse|lapses|matur(?:es|ity)|active (?:till|until))\b|समाप्त""", I)
  private val APPOINTMENT_KW = Regex("""\b(?:appointment|consultation|check-?up|lab test|blood test|scan|vaccination|vaccine|doctor|dr\.|hospital|clinic|dentist|physiotherapy|session with|meeting with|meeting on|meeting at|mri|x-?ray)\b|डॉक्टर|अपॉइंटमेंट""", I)
  private val TASK_KW = Regex("""\b(?:submit\w*|complete|deadline|kyc|update your|verify (?:your|by)|file your|register by|last date to|renew your|pending|to-?do|assignment|due today|due tomorrow)\b|\b(?:return|send|bring|collect|renew)\b.{0,40}\b(?:by|before)\b""", I)
  private val NEXT_KW = Regex("""\bnext (?:renewal|billing|payment|due|debit|charge)\b""", I)

  // ---- dates -----------------------------------------------------------------------------
  private val MONTHS = mapOf(
    "jan" to 1, "feb" to 2, "mar" to 3, "apr" to 4, "may" to 5, "jun" to 6, "jul" to 7, "aug" to 8, "sep" to 9, "oct" to 10, "nov" to 11, "dec" to 12,
  )
  private const val MON = """(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?"""
  private val DATE_ISO = Regex("""\b(20\d{2})-(\d{1,2})-(\d{1,2})\b""")
  private val DATE_NUMERIC = Regex("""(?<![0-9.,])(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4}|\d{2})(?![0-9])""")
  private val DATE_NUMERIC_SHORT = Regex("""\b(?:on|by|before|till|until|due|dt|date|expires|from)\s*:?\s*(\d{1,2})/(\d{1,2})(?![/0-9])""", I)
  private val DATE_DAY_MONTH = Regex("""\b(\d{1,2})(?:st|nd|rd|th)?[\s\-]*$MON(?:[\s,\-]*('?\d{4}|'\d{2}|\d{2}(?![0-9:])))?""", I)
  private val DATE_MONTH_DAY = Regex("""\b$MON\s+(\d{1,2})(?:st|nd|rd|th)?\b(?:,?\s*(\d{4}))?""", I)
  private val DATE_RELATIVE = Regex("""\b(day after tomorrow|tomorrow|today|tonight)\b|\bin (\d{1,2}) days?\b|\bwithin (\d{1,2}) days?\b|आज|कल सुबह""", I)
  private val WEEKDAYS = listOf("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")
  private val DATE_WEEKDAY = Regex("""\b(?:on |by |this |before |next )?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b""", I)
  private val TIME = Regex("""\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)(?![a-z])|\b([01]?\d|2[0-3]):([0-5]\d)\b(?!\s*(?:am|pm))""", I)

  private data class Amount(val start: Int, val end: Int, val minor: Long, val currency: String)
  private data class DateHit(val start: Int, val end: Int, val date: LocalDate)

  fun extract(title: String?, body: String?, postedAt: Long, zone: ZoneId = ZoneId.systemDefault()): NotificationInsight {
    val text = combine(title, body)
    if (text.isBlank()) return NotificationInsight(null, null, false, "")
    val evidence = mutableListOf<String>()
    val amounts = findAmounts(text)
    val anchor = Instant.ofEpochMilli(postedAt).atZone(zone).toLocalDate()
    val dates = findDates(text, anchor, amounts)
    val promo = PROMO.containsMatchIn(text)
    // A completed reversal or refund is real money back even when the message says the original payment failed.
    val completedReversal = Regex("""\b(?:reversed|refunded|credited back)\b""", RegexOption.IGNORE_CASE).containsMatchIn(text) &&
      !Regex("""\b(?:will be|shall be|to be) (?:reversed|refunded|credited)""", RegexOption.IGNORE_CASE).containsMatchIn(text)
    val failed = FAILED.containsMatchIn(text) && !completedReversal
    val notYet = NOT_YET.containsMatchIn(text)

    val money = if (!failed && !notYet) extractMoney(text, amounts, promo, evidence) else null
    val action = extractAction(text, amounts, dates, promo, money, zone, evidence)
    val subscription = SUB_KW.containsMatchIn(text) && !promo && (money?.direction == MoneyDirection.DEBIT || action?.kind == ActionKind.SUBSCRIPTION_RENEWAL) ||
      (money?.direction == MoneyDirection.DEBIT && (money.spendCategory == "subscriptions" || MoneyCategorizer.isSubscriptionMerchant(money.merchant)))
    return NotificationInsight(money, action, subscription, evidence.joinToString("; "))
  }

  private fun combine(title: String?, body: String?): String {
    val t = title?.trim().orEmpty()
    val b = body?.trim().orEmpty()
    val joined = when {
      t.isEmpty() -> b
      b.isEmpty() -> t
      b.startsWith(t, ignoreCase = true) -> b
      else -> "$t. $b"
    }
    return joined.replace(Regex("\\s+"), " ")
  }

  private fun findAmounts(text: String): List<Amount> = AMOUNT.findAll(text).mapNotNull { m ->
    val symbol = (m.groups[1]?.value ?: m.groups[4]?.value ?: "").lowercase()
    val number = m.groups[2]?.value ?: m.groups[3]?.value ?: return@mapNotNull null
    val value = number.replace(",", "").toBigDecimalOrNull() ?: return@mapNotNull null
    if (value.signum() <= 0) return@mapNotNull null
    val currency = when {
      symbol.startsWith("$") || symbol.startsWith("usd") || symbol.startsWith("us$") -> "USD"
      symbol == "€" || symbol == "eur" -> "EUR"
      symbol == "£" || symbol == "gbp" -> "GBP"
      else -> "INR"
    }
    Amount(m.range.first, m.range.last + 1, value.multiply(BigDecimal(100)).toLong(), currency)
  }.toList()

  private fun spendable(text: String, amount: Amount): Boolean {
    val before = text.substring(maxOf(0, amount.start - 30), amount.start)
    val after = text.substring(amount.end, minOf(text.length, amount.end + 16))
    return !NON_SPEND_BEFORE.containsMatchIn(before) && !NON_SPEND_AFTER.containsMatchIn(after)
  }

  private fun extractMoney(text: String, amounts: List<Amount>, promo: Boolean, evidence: MutableList<String>): MoneyEvent? {
    val candidates = amounts.filter { spendable(text, it) }
    if (candidates.isEmpty()) return null
    val creditText = COUNTERPARTY_CREDIT.replace(text) { " ".repeat(it.value.length) }
    val credits = CREDIT_VERB.findAll(creditText).map { it.range }.toList()
    val debits = DEBIT_VERB.findAll(text).map { it.range }.filter { d -> credits.none { c -> d.first <= c.last && d.last >= c.first } }.toList()
    if (debits.isEmpty() && credits.isEmpty()) return null
    if (promo && !Regex("""\b(?:debited|credited|spent|withdrawn|refunded|deducted)\b""", RegexOption.IGNORE_CASE).containsMatchIn(text)) return null

    // Pair each candidate amount with its nearest direction verb; take the closest pair.
    var best: Triple<Amount, MoneyDirection, Int>? = null
    for (amount in candidates) {
      for ((ranges, direction) in listOf(debits to MoneyDirection.DEBIT, credits to MoneyDirection.CREDIT)) {
        for (range in ranges) {
          val distance = if (range.first >= amount.end) range.first - amount.end else if (range.last < amount.start) amount.start - range.last else 0
          if (distance <= 60 && (best == null || distance < best.third)) best = Triple(amount, direction, distance)
        }
      }
    }
    val (amount, direction) = best ?: return null
    val merchant = findMerchant(text, amount, direction)
    val lower = text.lowercase()
    val channel = when {
      Regex("""\bupi\b|\bvpa\b|@ok|@ybl|@paytm|@axl|@ibl|@upi""").containsMatchIn(lower) -> "upi"
      Regex("""\batm\b""").containsMatchIn(lower) -> "atm"
      Regex("""\bcard\b""").containsMatchIn(lower) -> "card"
      Regex("""\b(?:netbanking|net banking|neft|imps|rtgs)\b""").containsMatchIn(lower) -> "bank_transfer"
      Regex("""\bwallet\b""").containsMatchIn(lower) -> "wallet"
      else -> null
    }
    val category = if (direction == MoneyDirection.CREDIT) MoneyCategorizer.incomeCategory(merchant, text, channel)
      else MoneyCategorizer.spendCategory(merchant, text, channel)
    evidence += "amount:${text.substring(amount.start, amount.end)}"
    evidence += "direction:${direction.wire}"
    merchant?.let { evidence += "merchant:$it" }
    return MoneyEvent(amount.minor, amount.currency, direction, merchant, channel, category)
  }

  private fun findMerchant(text: String, amount: Amount, direction: MoneyDirection): String? {
    val pattern = if (direction == MoneyDirection.DEBIT) MERCHANT_DEBIT else MERCHANT_CREDIT
    val matches = pattern.findAll(text).filter { it.range.first >= amount.start - 80 }.toList()
    val ordered = matches.sortedBy { kotlin.math.abs(it.range.first - amount.end) }
    for (match in ordered) {
      val cleaned = cleanMerchant(match.groupValues[1]) ?: continue
      return cleaned
    }
    if (direction == MoneyDirection.CREDIT) {
      NAME_SENT_YOU.find(text)?.let { m -> cleanMerchant(m.groupValues[1])?.let { return it } }
    } else {
      HINDI_KO.find(text)?.let { m -> cleanMerchant(m.groupValues[1])?.let { return it } }
      YOUR_SUBSCRIPTION.find(text)?.let { m -> cleanMerchant(m.groupValues[1])?.let { return it } }
    }
    // Credit fallback: a VPA anywhere in a credit message is the payer.
    if (direction == MoneyDirection.CREDIT) {
      Regex("""[\w.\-]+@[\w]+""").find(text)?.let { return cleanMerchant(it.value) }
    }
    return null
  }

  private fun cleanMerchant(raw: String): String? {
    var tokens = raw.trim().split(Regex("\\s+"))
    val firstLower = tokens.firstOrNull()?.lowercase()?.trimEnd('.', ',', ':') ?: return null
    if (firstLower in MERCHANT_REJECT_FIRST) return null
    val kept = mutableListOf<String>()
    for (token in tokens) {
      val lower = token.lowercase().trimEnd('.', ',', ':', ';')
      if (kept.isNotEmpty() && (lower in MERCHANT_STOP || lower.matches(Regex("x+\\d+|\\d{4,}|\\*+\\d+")))) break
      if (kept.isEmpty() && lower in MERCHANT_STOP) return null
      kept += token.trimEnd('.', ',', ':', ';')
    }
    tokens = kept
    var name = tokens.joinToString(" ")
    if (name.contains('@')) {
      name = name.substringBefore('@').replace(Regex("[._\\-]+"), " ").replace(Regex("\\d{6,}"), "").trim()
      if (name.isEmpty()) return "UPI transfer"
    }
    if (name.matches(Regex("(?i)x*\\d+|xx\\w*")) || MASKED.matches(name)) return null
    if (name.length < 2 || name.length > 40) return null
    val letters = name.filter { it.isLetter() }
    if (letters.isEmpty()) return null
    return if (letters == letters.uppercase() || letters == letters.lowercase()) {
      name.split(' ').joinToString(" ") { word -> word.lowercase().replaceFirstChar { it.uppercase() } }
    } else name
  }


  private fun extractAction(
    text: String, amounts: List<Amount>, dates: List<DateHit>, promo: Boolean, money: MoneyEvent?, zone: ZoneId,
    evidence: MutableList<String>,
  ): ActionItem? {
    if (dates.isEmpty()) return null
    val sub = SUB_STRONG.find(text)
    val hasAmount = amounts.any { spendable(text, it) }
    val kind: ActionKind
    val keyword: MatchResult
    when {
      sub != null && !promo && (!SUB_DONE.containsMatchIn(text) || NEXT_KW.containsMatchIn(text) || Regex("next billing|billing date", RegexOption.IGNORE_CASE).containsMatchIn(text)) -> {
        kind = ActionKind.SUBSCRIPTION_RENEWAL; keyword = NEXT_KW.find(text) ?: Regex("next billing|billing date", RegexOption.IGNORE_CASE).find(text) ?: sub
      }
      BILL_KW.find(text) != null && !promo && (hasAmount || Regex("\\b(?:bill|emi|premium)\\b", RegexOption.IGNORE_CASE).containsMatchIn(text)) -> {
        kind = ActionKind.BILL_DUE; keyword = BILL_KW.find(text)!!
      }
      DUE_GENERIC.find(text) != null && hasAmount && !promo -> { kind = ActionKind.BILL_DUE; keyword = DUE_GENERIC.find(text)!! }
      EXPIRY_KW.find(text) != null && !promo -> { kind = ActionKind.EXPIRY; keyword = EXPIRY_KW.find(text)!! }
      APPOINTMENT_KW.find(text) != null && !promo -> { kind = ActionKind.APPOINTMENT; keyword = APPOINTMENT_KW.find(text)!! }
      TASK_KW.find(text) != null && !promo -> { kind = ActionKind.TASK; keyword = TASK_KW.find(text)!! }
      DUE_GENERIC.find(text) != null && !promo -> { kind = ActionKind.TASK; keyword = DUE_GENERIC.find(text)!! }
      else -> return null
    }
    // A completed payment with no forward-looking date is not an action.
    if (money != null && kind != ActionKind.SUBSCRIPTION_RENEWAL && !Regex("""\b(?:due|by|before|till|until|expir|valid|next|appointment|on or before)\b""", RegexOption.IGNORE_CASE).containsMatchIn(text)) return null
    val due = dates.firstOrNull { it.start >= keyword.range.first } ?: dates.minByOrNull { kotlin.math.abs(it.start - keyword.range.first) } ?: return null
    val time = TIME.findAll(text).firstOrNull { m -> amounts.none { m.range.first in it.start until it.end } && dates.none { d -> m.range.first in d.start until d.end && !m.value.contains(':') } }
    val localTime = time?.let { parseTime(it) }
    val dueAt = (if (localTime != null) due.date.atTime(localTime) else due.date.atStartOfDay()).atZone(zone).toInstant().toEpochMilli()
    val actionAmount = when (kind) {
      ActionKind.BILL_DUE, ActionKind.SUBSCRIPTION_RENEWAL -> pickDueAmount(text, amounts)
      else -> null
    }
    evidence += "action:${kind.wire}"
    evidence += "date:${text.substring(due.start, due.end)}"
    return ActionItem(kind, dueAt, localTime != null, actionAmount?.minor, actionAmount?.currency)
  }

  private fun pickDueAmount(text: String, amounts: List<Amount>): Amount? {
    val preferred = amounts.firstOrNull { a ->
      val before = text.substring(maxOf(0, a.start - 28), a.start).lowercase()
      Regex("""(?:total (?:amount )?due|amount due|bill amount|amount of|bill of|emi of|premium of|due of|outstanding of|total outstanding|for)\W*$""").containsMatchIn(before) &&
        !before.contains("min")
    }
    return preferred ?: amounts.firstOrNull { spendable(text, it) }
  }

  private fun parseTime(m: MatchResult): LocalTime? = runCatching {
    if (m.groups[3] != null) {
      var hour = m.groupValues[1].toInt()
      val minute = m.groups[2]?.value?.toInt() ?: 0
      val pm = m.groupValues[3].lowercase().startsWith("p")
      if (hour == 12) hour = 0
      if (pm) hour += 12
      LocalTime.of(hour, minute)
    } else LocalTime.of(m.groupValues[4].toInt(), m.groupValues[5].toInt())
  }.getOrNull()

  private fun findDates(text: String, anchor: LocalDate, amounts: List<Amount>): List<DateHit> {
    val hits = mutableListOf<DateHit>()
    fun overlapsAmount(range: IntRange) = amounts.any { range.first < it.end && range.last >= it.start }
    fun add(range: IntRange, date: LocalDate?) {
      if (date == null || overlapsAmount(range) || hits.any { range.first <= it.end && range.last >= it.start }) return
      hits += DateHit(range.first, range.last + 1, date)
    }
    DATE_ISO.findAll(text).forEach { add(it.range, safeDate(it.groupValues[1].toInt(), it.groupValues[2].toInt(), it.groupValues[3].toInt())) }
    DATE_NUMERIC.findAll(text).forEach { m ->
      val year = m.groupValues[3].toInt().let { if (it < 100) 2000 + it else it }
      add(m.range, safeDate(year, m.groupValues[2].toInt(), m.groupValues[1].toInt()))
    }
    DATE_DAY_MONTH.findAll(text).forEach { m ->
      val month = MONTHS[m.groupValues[2].lowercase().take(3)] ?: return@forEach
      val yearText = m.groupValues[3].trim('\'')
      val day = m.groupValues[1].toInt()
      add(m.range, if (yearText.isNotEmpty()) safeDate(yearText.toInt().let { if (it < 100) 2000 + it else it }, month, day) else inferYear(anchor, month, day))
    }
    DATE_MONTH_DAY.findAll(text).forEach { m ->
      val month = MONTHS[m.groupValues[1].lowercase().take(3)] ?: return@forEach
      val day = m.groupValues[2].toInt()
      add(m.range, if (m.groupValues[3].isNotEmpty()) safeDate(m.groupValues[3].toInt(), month, day) else inferYear(anchor, month, day))
    }
    DATE_NUMERIC_SHORT.findAll(text).forEach { m ->
      val group = m.groups[1]!!
      add(group.range.first..m.range.last, inferYear(anchor, m.groupValues[2].toInt(), m.groupValues[1].toInt()))
    }
    DATE_WEEKDAY.findAll(text).forEach { m ->
      val target = WEEKDAYS.indexOf(m.groupValues[1].lowercase()) + 1
      val delta = ((target - anchor.dayOfWeek.value) + 7) % 7
      add(m.range, anchor.plusDays(if (delta == 0 && m.value.lowercase().startsWith("next")) 7L else delta.toLong()))
    }
    DATE_RELATIVE.findAll(text).forEach { m ->
      val value = m.value.lowercase()
      val date = when {
        value == "today" || value == "tonight" || value == "आज" -> anchor
        value == "tomorrow" || value == "कल सुबह" -> anchor.plusDays(1)
        value == "day after tomorrow" -> anchor.plusDays(2)
        m.groups[2] != null -> anchor.plusDays(m.groupValues[2].toLong())
        m.groups[3] != null -> anchor.plusDays(m.groupValues[3].toLong())
        else -> null
      }
      add(m.range, date)
    }
    return hits.sortedBy { it.start }
  }

  private fun safeDate(year: Int, month: Int, day: Int): LocalDate? = runCatching { LocalDate.of(year, month, day) }.getOrNull()

  /** A date without a year is the next occurrence, allowing up to 30 days in the past (e.g. "was due"). */
  private fun inferYear(anchor: LocalDate, month: Int, day: Int): LocalDate? {
    val sameYear = safeDate(anchor.year, month, day) ?: return null
    return if (sameYear.isBefore(anchor.minusDays(30))) safeDate(anchor.year + 1, month, day) else sameYear
  }

  fun merchantKey(merchant: String?): String? = merchant?.lowercase()?.replace(Regex("[^a-z0-9]"), "")?.takeIf { it.isNotEmpty() }

}
