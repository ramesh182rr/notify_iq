package com.notifyiq

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class SavedSearchesTest {
  @get:Rule val temporaryFolder = TemporaryFolder()

  @Test
  fun savedSearchesPersistFiltersAndCanBeDeleted() {
    val repository = NotificationRepository(temporaryFolder.newFile("saved-searches.db"))
    val filters = """{"query":"invoice","packageName":"com.bank","category":"finance","groupName":"Bills","dateRange":"7days","includeArchived":true}"""

    val saved = JSONObject(repository.addSavedSearch("  Recent invoices  ", filters)).getJSONArray("searches").getJSONObject(0)
    assertEquals("Recent invoices", saved.getString("name"))
    assertEquals("invoice", saved.getString("query"))
    assertEquals("com.bank", saved.getString("packageName"))
    assertEquals("finance", saved.getString("category"))
    assertEquals("Bills", saved.getString("groupName"))
    assertEquals("7days", saved.getString("dateRange"))
    assertEquals(true, saved.getBoolean("includeArchived"))

    val reopened = NotificationRepository(temporaryFolder.root.resolve("saved-searches.db"))
    assertEquals(saved.toString(), JSONObject(reopened.getSavedSearches()).getJSONArray("searches").getJSONObject(0).toString())
    assertEquals(0, JSONObject(reopened.deleteSavedSearch(saved.getString("id"))).getJSONArray("searches").length())
  }

  @Test
  fun invalidCategoriesAndSearchNamesAreRejected() {
    val empty = SavedSearchCodec.emptyJson()
    assertThrows(IllegalArgumentException::class.java) {
      SavedSearchCodec.add(empty, "Finance", """{"category":"unknown"}""")
    }
    assertThrows(IllegalArgumentException::class.java) {
      SavedSearchCodec.add(empty, "   ", "{}")
    }
  }
}
