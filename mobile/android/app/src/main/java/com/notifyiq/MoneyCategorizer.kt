package com.notifyiq

/**
 * Deterministic spend and income categories for extracted money events.
 *
 * Order matters: more specific categories come first (a café before food, movie tickets before
 * travel). Merchant names are matched as normalised substrings; message text is matched on word
 * boundaries so "fuel" in "fuel surcharge waived" on a shopping alert does not win over the merchant.
 */
internal object MoneyCategorizer {
  val SPEND_CATEGORIES = listOf(
    "snacks", "food", "groceries", "fuel", "transport", "tickets", "entertainment", "subscriptions", "shopping",
    "bills", "rent", "health", "education", "personal_care", "loans_insurance", "investments", "transfers", "cash", "other",
  )
  val INCOME_CATEGORIES = listOf("salary", "refund", "cashback", "interest", "transfers_in", "other_income")

  private data class Rule(val category: String, val merchants: List<String>, val words: List<String> = emptyList())

  /**
   * Kind-of-business words found in local merchant names ("Sri Balaji Filling Station", "Sai Departmental
   * Store", "Shree Medicals"). Checked after brand names and before message words. Matched on whole words,
   * singular or plural; multi-word entries must appear in order.
   */
  private val merchantTypes = listOf(
    "fuel" to listOf("filling station", "fuel station", "petrol pump", "petrol bunk", "petroleum", "petro", "fuel", "petrol", "diesel", "cng", "oil company", "oil corporation", "oil", "service station", "ev charging"),
    "groceries" to listOf("departmental", "department store", "provision", "general store", "kirana", "supermarket", "super market", "supermart", "hypermarket", "mart", "bazaar", "grocery", "vegetable", "fruit", "milk", "dairy", "chicken", "mutton", "meat", "fish", "egg", "rice mandi", "flour mill"),
    "health" to listOf("medical", "medicals", "chemist", "druggist", "pharmacy", "pharma", "clinic", "hospital", "diagnostic", "lab", "dental", "nursing home", "optical", "physiotherapy", "gym", "fitness"),
    "snacks" to listOf("bakery", "bakers", "sweet", "tea stall", "chai", "juice", "cafe", "coffee", "ice cream", "chaat", "snack"),
    "food" to listOf("hotel", "bhavan", "bhawan", "canteen", "mess", "kitchen", "restaurant", "dhaba", "bhojanalaya", "biryani", "tiffin", "eatery", "food", "foods", "dosa", "idli"),
    "shopping" to listOf("textile", "fashion", "garment", "boutique", "footwear", "shoe", "jeweller", "jewellery", "jewelry", "mobile", "electronics", "electrical", "hardware", "paint", "furniture", "stationery", "book store", "gift", "toy", "watch", "optic"),
    "tickets" to listOf("ksrtc", "apsrtc", "tsrtc", "msrtc", "gsrtc", "upsrtc", "rsrtc", "hrtc", "travels", "tours", "railway", "airline"),
    "transport" to listOf("car wash", "garage", "tyre", "motor", "auto stand", "taxi", "cab", "parking", "toll"),
    "personal_care" to listOf("salon", "barber", "beauty parlour", "spa", "unisex", "hair"),
    "education" to listOf("school", "college", "tuition", "academy", "coaching", "institute", "classes"),
    "rent" to listOf("pg", "hostel", "rental", "rent"),
  ).map { (category, phrases) -> category to phrases.map { phrase -> phrase.split(' ').map(::singular) } }

  private fun singular(word: String) = if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) word.dropLast(1) else word

  private fun merchantType(merchant: String): String? {
    val tokens = merchant.lowercase().split(Regex("[^a-z0-9]+")).filter(String::isNotEmpty).map(::singular)
    for ((category, phrases) in merchantTypes) {
      if (phrases.any { phrase -> tokens.windowed(phrase.size).any { it == phrase } }) return category
    }
    return null
  }

  /** "Priya S", "R Kumar": a person (a name with an initial), not a shop. */
  private fun looksLikePerson(merchant: String): Boolean {
    val words = merchant.trim().split(Regex("\\s+"))
    return words.size in 2..3 && merchant.none(Char::isDigit) && words.any { it.trimEnd('.').length == 1 }
  }

  private val spendRules = listOf(
    Rule("snacks", listOf("starbucks", "chaayos", "ccd", "cafecoffeeday", "thirdwave", "bluetokai", "barista", "bakery", "bakers", "haldiram", "baskin", "naturals", "icecream", "juice", "chai", "teastall", "keventers", "dunkin", "krispykreme", "theobroma", "mithai", "sweets"),
      listOf("snacks", "coffee", "tea", "cafe", "café", "bakery", "ice cream", "juice", "chai")),
    Rule("food", listOf("swiggy", "zomato", "domino", "mcdonald", "kfc", "pizza", "burger", "biryani", "restaurant", "dhaba", "eatfit", "behrouz", "faasos", "box8", "subway", "barbeque", "dineout", "eatsure", "wowmomo", "tacobell"),
      listOf("restaurant", "dinner", "lunch", "food order", "food delivery", "dine")),
    Rule("groceries", listOf("bigbasket", "blinkit", "zepto", "dmart", "grofers", "instamart", "jiomart", "grocery", "supermarket", "kirana", "reliancefresh", "moremegastore", "spencer", "naturebasket", "milkbasket", "countrydelight", "smartbazaar", "starbazaar", "bigbazaar", "ratnadeep", "reliancesmart", "vishalmega", "lulu", "nilgiris", "licious", "freshtohome", "moresupermarket", "nandini", "amul"),
      listOf("groceries", "grocery", "vegetables", "milk", "supermarket", "departmental store", "provision store", "general store", "kirana")),
    Rule("fuel", listOf("petrol", "fuel", "hpcl", "bpcl", "iocl", "indianoil", "shellpetrol", "nayara", "hindustanpetroleum", "bharatpetroleum", "evcharging", "statiq", "chargezone", "jiobp", "reliancebp", "essar"),
      listOf("fuel", "petrol", "diesel", "cng", "ev charging", "petrol pump", "filling station", "fuel station")),
    Rule("transport", listOf("uber", "ola", "rapido", "metro", "namma", "bmtc", "best", "fastag", "parking", "toll", "yulu", "bounce", "blusmart", "nammayatri", "auto"),
      listOf("cab", "ride", "taxi", "metro", "toll", "parking", "fastag", "auto rickshaw")),
    Rule("entertainment", listOf("bookmyshow", "pvr", "inox", "cinepolis", "district", "insider", "steam", "playstation", "xbox", "nintendo", "timezone", "smaaash", "wonderla", "imagica"),
      listOf("movie", "movies", "cinema", "concert", "event ticket", "show ticket", "gaming")),
    Rule("tickets", listOf("irctc", "makemytrip", "goibibo", "indigo", "airindia", "redbus", "cleartrip", "vistara", "akasa", "spicejet", "ixigo", "yatra", "easemytrip", "abhibus", "oyo", "airbnb", "bookingcom", "agoda", "treebo", "fabhotels"),
      listOf("flight", "train ticket", "bus ticket", "pnr", "boarding", "hotel booking", "air ticket")),
    Rule("subscriptions", listOf("netflix", "spotify", "prime", "hotstar", "youtube", "zee5", "sonyliv", "jiocinema", "audible", "apple", "googleplay", "icloud", "linkedin", "gaana", "wynk", "aha", "mubi", "chatgpt", "openai", "microsoft", "adobe", "notion", "canva"),
      listOf("subscription", "membership")),
    Rule("shopping", listOf("amazon", "flipkart", "myntra", "ajio", "meesho", "nykaa", "tatacliq", "croma", "decathlon", "ikea", "reliancedigital", "lifestyle", "westside", "pantaloons", "zara", "hm", "uniqlo", "lenskart", "firstcry", "pepperfry", "snapdeal", "shoppersstop", "maxfashion", "reliancetrends", "tanishq", "malabargold", "kalyanjewellers", "bata", "poorvika", "sangeetha", "vijaysales", "relianceretail"),
      listOf("shopping", "order", "purchase")),
    Rule("bills", listOf("electricity", "bescom", "tatapower", "adani", "msedcl", "tneb", "water", "gas", "indane", "hpgas", "bharatgas", "broadband", "airtel", "jio", "vodafone", "vi", "bsnl", "actfibernet", "hathway", "tatasky", "tataplay", "dishtv", "d2h"),
      listOf("electricity", "bill", "recharge", "broadband", "postpaid", "prepaid", "dth", "gas cylinder", "water bill")),
    Rule("rent", listOf("nobroker", "nestaway", "landlord", "housing", "mygate", "society", "apartment"),
      listOf("rent", "maintenance", "society charges", "landlord")),
    Rule("health", listOf("pharmacy", "apollo", "medplus", "1mg", "tata1mg", "pharmeasy", "netmeds", "hospital", "clinic", "diagnostic", "lab", "dental", "practo", "cultfit", "cult", "healthify", "fortis", "manipal", "maxhospital", "maxhealthcare"),
      listOf("pharmacy", "medicine", "hospital", "clinic", "doctor", "consultation", "diagnostic", "lab test", "gym")),
    Rule("education", listOf("school", "college", "university", "udemy", "coursera", "byju", "unacademy", "vedantu", "physicswallah", "upgrad", "simplilearn", "skillshare", "duolingo"),
      listOf("tuition", "school fee", "college fee", "course fee", "exam fee")),
    Rule("personal_care", listOf("salon", "spa", "urbancompany", "lakme", "naturalssalon", "barber", "beautyparlour", "looks", "greentrends"),
      listOf("salon", "haircut", "spa", "grooming", "parlour")),
    Rule("loans_insurance", listOf("lic", "insurance", "policybazaar", "hdfclife", "iciciprudential", "sbilife", "bajajfinserv", "bajajfinance", "loan", "emi"),
      listOf("emi", "loan", "insurance", "premium", "policy")),
    Rule("investments", listOf("zerodha", "groww", "upstox", "kuvera", "coin", "smallcase", "paytmmoney", "angelone", "indmoney", "mutualfund", "nps", "ppf"),
      listOf("sip", "mutual fund", "investment", "stocks", "fixed deposit", "recurring deposit")),
  )

  fun spendCategory(merchant: String?, text: String, channel: String?): String {
    if (merchant != null) spendRules.firstOrNull { rule -> rule.merchants.any { merchantMatches(merchant, it) } }?.let { return it.category }
    if (merchant != null) merchantType(merchant)?.let { return it }
    val lower = text.lowercase()
    if (channel == "atm" || Regex("\\b(?:atm|cash withdrawal|withdrawn)\\b").containsMatchIn(lower)) return "cash"
    spendRules.firstOrNull { rule -> rule.words.any { word -> Regex("\\b${Regex.escape(word)}\\b").containsMatchIn(lower) } }?.let { return it.category }
    if (channel == "upi" && merchant != null && merchant.split(' ').size in 1..3 && merchant.none { it.isDigit() }) return "transfers"
    if (merchant != null && looksLikePerson(merchant)) return "transfers"
    if (channel == "bank_transfer" || Regex("\\b(?:neft|imps|rtgs|transferred)\\b").containsMatchIn(lower)) return "transfers"
    return "other"
  }

  fun incomeCategory(merchant: String?, text: String, channel: String?): String {
    val lower = text.lowercase()
    return when {
      Regex("\\b(?:salary|sal|payroll|stipend|wages)\\b").containsMatchIn(lower) -> "salary"
      Regex("\\b(?:refund|refunded|reversed|reversal|chargeback)\\b").containsMatchIn(lower) -> "refund"
      Regex("\\b(?:cashback|reward|rewards|scratch card|points redeemed)\\b").containsMatchIn(lower) -> "cashback"
      Regex("\\b(?:interest|dividend|maturity)\\b").containsMatchIn(lower) -> "interest"
      merchant != null && Regex("(?i)\\b(?:pvt|private|ltd|limited|llp|technologies|solutions|services)\\b").containsMatchIn(merchant) &&
        Regex("\\b(?:neft|rtgs|imps)\\b").containsMatchIn(lower) -> "salary"
      channel == "upi" || channel == "bank_transfer" || merchant != null || Regex("\\b(?:sent you|paid you|bheje|from)\\b").containsMatchIn(lower) -> "transfers_in"
      else -> "other_income"
    }
  }

  fun isSubscriptionMerchant(merchant: String?): Boolean {
    merchant ?: return false
    return spendRules.first { it.category == "subscriptions" }.merchants.any { merchantMatches(merchant, it) }
  }

  /** Keywords of 4 characters or fewer must equal a whole merchant word ("ola" must not match "Coca-Cola"). */
  private fun merchantMatches(merchant: String, keyword: String): Boolean {
    val lower = merchant.lowercase()
    if (keyword.length <= 4) return lower.split(Regex("[^a-z0-9]+")).any { it == keyword }
    return lower.replace(Regex("[^a-z0-9]"), "").contains(keyword)
  }
}
