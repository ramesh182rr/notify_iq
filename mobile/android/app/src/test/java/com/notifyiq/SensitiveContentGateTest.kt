package com.notifyiq

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SensitiveContentGateTest {
  @Test
  fun discardsOtpAndVerificationCodes() {
    assertTrue(SensitiveContentGate.containsSensitiveContent("Your OTP is 483920"))
    assertTrue(SensitiveContentGate.containsSensitiveContent("Your verification code: 8351"))
  }

  @Test
  fun discardsPasswordAssignments() {
    assertTrue(SensitiveContentGate.containsSensitiveContent("Password: rabbit-horse-2034"))
    assertFalse(SensitiveContentGate.containsSensitiveContent("Reset your password in the app"))
  }

  @Test
  fun discardsValidPaymentCardNumbers() {
    assertTrue(SensitiveContentGate.containsSensitiveContent("Card 4111 1111 1111 1111"))
    assertFalse(SensitiveContentGate.containsSensitiveContent("Order reference 4111 1111 1111 1112"))
  }

  @Test
  fun allowsOrdinaryNotificationContent() {
    assertFalse(SensitiveContentGate.containsSensitiveContent("Your parcel is out for delivery."))
    assertFalse(SensitiveContentGate.containsSensitiveContent("The delivery is scheduled for 8:30 PM."))
  }
}
