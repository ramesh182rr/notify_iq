#!/usr/bin/env python3
"""NotifyIQ end-to-end UI checks on an attached emulator (debug build + Metro on 8093).

No extra dependencies: drives the device with adb and reads the UI through the accessibility tree
(uiautomator). Synthetic notifications are posted by mobile/dev-fixture-poster. Every flow cleans up.

Usage (from repo root, emulator running, debug app + poster installed, Metro on 8093):
    python3 -I mobile/e2e/notifyiq_e2e.py [--serial emulator-5554] [--keep]

Flows: launch & tabs, onboarding skip state, theme persistence, capture + sensitive discard,
real app names, app picker filter, money + view source, coming up + view source, exclusion via picker,
encrypted backup export/import round trip, cleanup.
"""
import argparse
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET

APP = "com.notifyiq"
POSTER = "com.notifyiq.fixtureposter"
LISTENER = f"{APP}/{APP}.NotifyIQNotificationListener"


class Device:
    def __init__(self, serial=None):
        self.prefix = ["adb"] + (["-s", serial] if serial else [])

    def sh(self, *args, check=False):
        out = subprocess.run(self.prefix + ["shell", *args], capture_output=True, text=True)
        if check and out.returncode:
            raise RuntimeError(out.stderr)
        return out.stdout

    def adb(self, *args):
        return subprocess.run(self.prefix + list(args), capture_output=True, text=True).stdout

    def nodes(self):
        self.sh("uiautomator", "dump", "/sdcard/e2e.xml")
        xml = self.sh("cat", "/sdcard/e2e.xml")
        try:
            root = ET.fromstring(xml[xml.index("<?xml"):] if "<?xml" in xml else xml)
        except (ET.ParseError, ValueError):
            return []
        result = []
        for n in root.iter("node"):
            b = list(map(int, re.findall(r"\d+", n.get("bounds", "[0,0][0,0]"))))
            result.append({"text": n.get("text", ""), "desc": n.get("content-desc", ""), "class": n.get("class", ""),
                           "checked": n.get("checked") == "true", "x": (b[0] + b[2]) // 2, "y": (b[1] + b[3]) // 2,
                           "h": b[3] - b[1], "pkg": n.get("package", "")})
        return result

    def find(self, label, exact=True, visible_band=(200, 2150)):
        for n in self.nodes():
            values = (n["text"], n["desc"])
            ok = label in values if exact else any(label in v for v in values)
            if ok and visible_band[0] < n["y"] < visible_band[1]:
                return n
        return None

    def has(self, label, exact=False):
        return any((label in (n["text"], n["desc"])) if exact else (label in n["text"] or label in n["desc"]) for n in self.nodes())

    def tap(self, label, exact=True, scroll=0, anywhere=False):
        for attempt in range(scroll + 1):
            node = self.find(label, exact, (0, 10_000) if anywhere else (200, 2150))
            if node:
                self.sh("input", "tap", str(node["x"]), str(node["y"]))
                time.sleep(1.2)
                return True
            if attempt < scroll:
                self.sh("input", "swipe", "540", "1700", "540", "900", "300")
                time.sleep(0.6)
        return False

    def reveal(self, swipes=2):
        # Scroll so freshly expanded form fields sit above the floating tab bar.
        for _ in range(swipes):
            self.sh("input", "swipe", "540", "1600", "540", "900", "300")
            time.sleep(0.5)

    def wait_for(self, label, timeout=10, exact=False):
        end = time.time() + timeout
        while time.time() < end:
            if self.has(label, exact=exact):
                return True
            time.sleep(0.7)
        return False

    def type_into(self, label, text):
        self.hide_keyboard()
        found = False
        for direction in ("down", "down", "down", "up", "up"):
            if self.tap(label):
                found = True
                break
            y1, y2 = ("1500", "1000") if direction == "down" else ("900", "1400")
            self.sh("input", "swipe", "540", y1, "540", y2, "300")
            time.sleep(0.6)
        if not found:
            return False
        time.sleep(0.8)
        self.sh("input", "text", text)
        time.sleep(0.6)
        # Verify the text landed in the intended field (password fields report one bullet per character).
        field = next((n for n in self.nodes() if n["desc"] == label), None)
        return bool(field) and len(field["text"]) == len(text)

    def hide_keyboard(self):
        # Only press BACK when the keyboard is visible; otherwise BACK would leave the app.
        if "mInputShown=true" in self.sh("dumpsys", "input_method"):
            self.sh("input", "keyevent", "KEYCODE_BACK")
            time.sleep(0.6)

    def scroll_top(self):
        for _ in range(6):
            self.sh("input", "swipe", "540", "700", "540", "1900", "150")
        time.sleep(0.6)

    def tab(self, name):
        for n in self.nodes():
            if n["desc"] == name and n["y"] > 1900:
                self.sh("input", "tap", str(n["x"]), str(n["y"]))
                time.sleep(2)
                return True
        return False

    def post(self, nid, title, text):
        self.sh(f"am start -n {POSTER}/.PostActivity --ei id {nid} --es title '{title}' --es text '{text}'")
        time.sleep(1.0)

    def cancel(self, nid):
        self.sh(f"am start -n {POSTER}/.PostActivity --ei id {nid} --ez cancel true")

    def launch(self, wait=8):
        self.sh("am", "force-stop", APP)
        self.sh("am", "start", "-n", f"{APP}/.MainActivity")
        time.sleep(wait)

    def sql(self, query):
        """Debug builds only: copies the DB (with WAL) to a temp path and queries it with host sqlite3."""
        import os, tempfile
        d = tempfile.mkdtemp()
        for f in ("notifyiq.db", "notifyiq.db-wal", "notifyiq.db-shm"):
            data = subprocess.run(self.prefix + ["exec-out", "run-as", APP, "cat", f"databases/{f}"], capture_output=True).stdout
            if data:
                open(os.path.join(d, f), "wb").write(data)
        return subprocess.run(["sqlite3", "-readonly", os.path.join(d, "notifyiq.db"), query], capture_output=True, text=True).stdout.strip()


class Runner:
    def __init__(self, device):
        self.d = device
        self.results = []

    def check(self, name, ok, detail=""):
        self.results.append((name, bool(ok), detail))
        print(f"{'PASS' if ok else 'FAIL'}  {name}{('  — ' + detail) if detail and not ok else ''}", flush=True)

    def run(self, keep=False):
        d = self.d
        d.sh("pm", "grant", POSTER, "android.permission.POST_NOTIFICATIONS")
        d.sh("cmd", "notification", "allow_listener", LISTENER)
        d.adb("reverse", "tcp:8093", "tcp:8093")
        d.launch()
        if d.has("Welcome to NotifyIQ"):
            d.tap("Skip")
        self.check("app launches to Home", d.has("Your notifications, understood."))
        for tab in ["Inbox", "Insights", "Settings", "Home"]:
            self.check(f"tab {tab} opens", d.tab(tab))

        # Theme persistence (Settings → Appearance)
        d.tab("Settings"); d.tap("Dark", scroll=4)
        d.launch()
        d.tab("Settings")
        for _ in range(4):
            if d.find("Dark"): break
            d.sh("input", "swipe", "540", "1700", "540", "900", "300"); time.sleep(0.5)
        dark = any(n["checked"] and (n["text"] == "Dark" or n["desc"] == "Dark") for n in d.nodes())
        self.check("theme choice survives restart", dark)
        d.tap("System", scroll=4)

        # Capture, sensitive discard, money/date extraction
        d.sh("input", "keyevent", "KEYCODE_HOME")
        d.post(9001, "Payment successful", "₹180 paid to Swiggy")
        d.post(9002, "Electricity bill", "Your electricity bill of Rs 1,240 is due on 28/11/2030")
        d.post(9003, "Bank alert", "Your OTP is 482913. Do not share it")
        d.post(9004, "Account", "Your password is Hunter2Synthetic")
        time.sleep(2)
        titles = d.sql("select group_concat(title, '|') from notification_events where package_name='%s'" % POSTER)
        self.check("normal notifications captured", "Payment successful" in titles and "Electricity bill" in titles, titles)
        self.check("OTP and password notifications discarded", "Bank alert" not in titles and "Account" not in titles, titles)
        self.check("money extracted", d.sql("select amount_minor from notification_insights where amount_minor is not null") == "18000")
        self.check("bill due date extracted", d.sql("select action_kind from notification_insights where action_kind is not null") == "bill_due")
        self.check("real app name recorded", d.sql(f"select label from app_directory where package_name='{POSTER}'") == "NotifyIQ Fixture Poster")

        # Inbox shows real names; picker filters
        d.launch(6)
        d.tab("Inbox")
        self.check("inbox shows real app name", d.has("NotifyIQ Fixture Poster", exact=True))
        d.tap("Filters", exact=False)
        d.tap("Filter by app: all apps", scroll=2)
        self.check("app picker lists captured app by name only", d.has("NotifyIQ Fixture Poster", exact=True) and not d.has(POSTER))
        d.tap("NotifyIQ Fixture Poster", anywhere=True)
        self.check("app filter applied", d.has("App: NotifyIQ Fixture Poster"))
        d.tap("Filter by app: NotifyIQ Fixture Poster", scroll=2)
        d.tap("All apps", anywhere=True)

        # Money → view source
        d.tab("Insights"); d.tap("Money")
        d.wait_for("MONEY OUT")
        opened = d.tap("View the notification for Swiggy", scroll=10)
        time.sleep(1.5)
        self.check("money row opens its source notification", opened and d.has("180 paid to Swiggy") and d.has("Source notification"))
        d.tap("Close", anywhere=True)
        d.scroll_top()
        d.tap("Coming up")
        d.wait_for("Dates found in your saved notifications")
        opened = d.tap("View the source notification", scroll=8)
        time.sleep(1.5)
        self.check("coming-up item opens its source notification", opened and d.has("electricity bill of Rs 1,240"))
        d.tap("Close", anywhere=True)

        # Encrypted backup round trip (uses Android's document UI on the emulator)
        self.backup_round_trip()

        # Choose apps: switch an app off by name/icon, then keep it again
        self.exclusion_toggle()

        if not keep:
            self.cleanup()
        failed = [r for r in self.results if not r[1]]
        print(f"\n{len(self.results) - len(failed)}/{len(self.results)} checks passed")
        return 0 if not failed else 1

    def open_settings_page(self, label):
        d = self.d
        d.tab("Settings"); d.scroll_top()
        if d.find("Back to Settings", visible_band=(0, 10_000)):
            d.tap("Back to Settings", anywhere=True)
        return d.tap(label, exact=False, scroll=4)

    def exclusion_toggle(self):
        d = self.d
        self.open_settings_page("Notification access & apps")
        d.tap("Choose apps", scroll=8)
        d.wait_for("Search apps")
        self.check("app list shows names, not package names", d.has("NotifyIQ Fixture Poster", exact=True) and not d.has(POSTER))
        d.tap("Keep notifications from NotifyIQ Fixture Poster", anywhere=True)
        d.tap("STOP KEEPING", anywhere=True) or d.tap("Stop keeping", anywhere=True)
        time.sleep(1.5)
        excluded = d.sql(f"select value from app_preferences where key='excluded:{POSTER}'") == "1"
        d.tap("Done", anywhere=True)
        time.sleep(1)
        shown = d.find("Keep notifications from NotifyIQ Fixture Poster again", visible_band=(0, 10_000)) is not None or d.has("Not kept")
        self.check("switching an app off excludes it and shows it by name", excluded and shown)
        d.tap("Keep notifications from NotifyIQ Fixture Poster again", scroll=6)
        time.sleep(1.5)
        self.check("keep again restores the app", d.sql(f"select count(*) from app_preferences where key='excluded:{POSTER}' and value='1'") == "0")

    def delete_all_history(self):
        d = self.d
        self.open_settings_page("Notification access & apps")
        d.tap("Delete all notification history", scroll=8)
        d.tap("DELETE HISTORY", anywhere=True) or d.tap("Delete history", anywhere=True)
        time.sleep(2)

    def backup_round_trip(self):
        d = self.d
        self.remove_backups()
        before = d.sql("select count(*) from notification_events")
        steps = {}
        self.open_settings_page("Backup & new phone")
        steps["export button"] = d.tap("Export backup", scroll=8)
        steps["password"] = d.type_into("Backup password", "e2epass2026")
        steps["confirm"] = d.type_into("Confirm backup password", "e2epass2026")
        d.hide_keyboard()
        steps["save button"] = d.tap("Save encrypted file", scroll=3, anywhere=True)
        time.sleep(3)
        d.wait_for("SAVE", timeout=8, exact=True)
        steps["picker save"] = d.tap("SAVE", anywhere=True) or d.tap("Save", anywhere=True)
        steps["saved message"] = d.wait_for("Backup saved", timeout=12)
        self.check("encrypted backup exported", all(steps.values()), ", ".join(k for k, v in steps.items() if not v) + " failed")
        self.delete_all_history()
        self.check("history empty before restore", d.sql("select count(*) from notification_events") == "0")
        steps = {}
        self.open_settings_page("Backup & new phone")
        steps["restore button"] = d.tap("Restore backup", scroll=8)
        steps["password"] = d.type_into("Backup password", "e2epass2026")
        d.hide_keyboard()
        steps["choose button"] = d.tap("Choose backup file", scroll=3, anywhere=True)
        time.sleep(1.2)
        steps["confirm dialog"] = d.tap("CHOOSE BACKUP FILE", anywhere=True) or d.tap("Choose backup file", anywhere=True)
        time.sleep(3)
        name = "NotifyIQ-backup-" + time.strftime("%Y-%m-%d") + ".niqbackup"
        d.wait_for(name, timeout=10, exact=True)
        time.sleep(1.5)  # let the document list settle before tapping
        steps["file picked"] = d.tap(name, anywhere=True)
        steps["restored message"] = d.wait_for("Restored", timeout=15)
        rows = d.sql("select count(*) from notification_events")
        self.check("encrypted backup restored", all(steps.values()) and rows == before,
                   ", ".join(k for k, v in steps.items() if not v) + f" failed; rows={rows} expected={before}")
        self.check("restored search index works", d.sql("select count(*) from notification_events_fts where notification_events_fts match 'Swiggy'") == "1")

    def cleanup(self):
        d = self.d
        for nid in (9001, 9002, 9003, 9004):
            d.cancel(nid)
        d.launch(6)
        self.delete_all_history()
        self.check("cleanup: history deleted", d.sql("select count(*) from notification_events") == "0")
        d.sh("cmd", "notification", "disallow_listener", LISTENER)
        d.sh("rm", "-f", "/sdcard/e2e.xml")
        # Remove backup files created by the export flow.
        self.remove_backups()

    def remove_backups(self):
        # One shell string so the device shell expands the glob.
        self.d.sh("rm -f /sdcard/Download/NotifyIQ-backup-*.niqbackup /sdcard/Documents/NotifyIQ-backup-*.niqbackup")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--serial")
    parser.add_argument("--keep", action="store_true", help="skip cleanup (for debugging)")
    args = parser.parse_args()
    sys.exit(Runner(Device(args.serial)).run(keep=args.keep))
