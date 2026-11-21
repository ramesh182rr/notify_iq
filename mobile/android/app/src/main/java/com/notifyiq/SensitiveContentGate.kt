package com.notifyiq

internal object SensitiveContentGate {
  private val credentialCode = Regex(
    "(?i)\\b(?:otp|one[ -]?time(?:[ -]?(?:password|code))?|verification|authentication|auth|security|login|passcode|pin)\\b.{0,32}?(?:\\bcode\\b\\s*)?(?:is\\s+|[:=#-]\\s*)?(?:\\d[ -]?){4,8}\\b",
  )
  private val genericCodeAssignment = Regex(
    "(?i)\\b(?:code|pin)\\s*(?:is\\s+|[:=]\\s*)(?:\\d[ -]?){4,8}\\b",
  )
  private val passwordAssignment = Regex(
    "(?i)\\b(?:password|passwd|passcode)\\s*(?:is\\s+|[:=]\\s*)\\S{4,}",
  )
  private val cardCandidate = Regex("(?<!\\d)(?:\\d[ -]?){13,19}(?!\\d)")

  fun containsSensitiveContent(fields: Iterable<String?>): Boolean =
    fields.filterNotNull().any(::containsSensitiveContent)

  fun containsSensitiveContent(value: String): Boolean {
    if (credentialCode.containsMatchIn(value) ||
      genericCodeAssignment.containsMatchIn(value) ||
      passwordAssignment.containsMatchIn(value)
    ) {
      return true
    }

    return cardCandidate.findAll(value).any { match ->
      passesLuhn(match.value.filter(Char::isDigit))
    }
  }

  private fun passesLuhn(digits: String): Boolean {
    if (digits.length !in 13..19) return false

    var sum = 0
    var doubleDigit = false
    for (index in digits.indices.reversed()) {
      var digit = digits[index].digitToInt()
      if (doubleDigit) {
        digit *= 2
        if (digit > 9) digit -= 9
      }
      sum += digit
      doubleDigit = !doubleDigit
    }
    return sum % 10 == 0
  }
}
