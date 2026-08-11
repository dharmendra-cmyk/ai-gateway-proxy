import os
import time
import json
import hmac
import hashlib

class SyncPulseAgentLoop:
    def __init__(self, check_interval_seconds: int = 3):
        self.check_interval_seconds = check_interval_seconds
        self.synced_events = set()
        self.is_running = True

    def observe(self) -> list:
        """Step 1: Poll store queues / webhooks for inventory changes."""
        # Simulated inventory event queue (e.g., stock update from 3PL/ERP)
        pending_events = [
            {"sku": "SKU-99201", "warehouse_qty": 150, "shopify_qty": 142, "event_id": "EVT-101"},
            {"sku": "SKU-88304", "warehouse_qty": 0, "shopify_qty": 12, "event_id": "EVT-102"}
        ]
        
        # Filter for unprocessed inventory events
        unprocessed = [e for e in pending_events if e["event_id"] not in self.synced_events]
        return unprocessed

    def orient_and_plan(self, event: dict) -> dict:
        """Step 2: Calculate inventory delta and evaluate sync necessity."""
        sku = event["sku"]
        delta = event["warehouse_qty"] - event["shopify_qty"]
        
        print(f"[ORIENT] Evaluating SKU {sku} | Delta: {delta} units")
        
        requires_sync = delta != 0
        is_stockout_risk = event["warehouse_qty"] == 0 and event["shopify_qty"] > 0
        
        return {
            "event_id": event["event_id"],
            "sku": sku,
            "target_qty": event["warehouse_qty"],
            "requires_sync": requires_sync,
            "is_stockout_risk": is_stockout_risk
        }

    def act(self, plan: dict) -> dict:
        """Step 3: Generate HMAC-signed payload and trigger sub-second Shopify API push."""
        if not plan["requires_sync"]:
            return {"status": "SKIPPED", "event_id": plan["event_id"]}
        
        print(f"[ACT] Executing sub-second HMAC sync for {plan['sku']} -> New Qty: {plan['target_qty']}")
        
        # Simulate HMAC signature generation for secure Shopify webhook/API push
        payload = json.dumps({"sku": plan["sku"], "inventory_quantity": plan["target_qty"]})
        signature = hmac.new(b"syncpulse_secret_key", payload.encode('utf-8'), hashlib.sha256).hexdigest()
        
        return {
            "status": "SUCCESS",
            "event_id": plan["event_id"],
            "sku": plan["sku"],
            "signature": signature,
            "stockout_flag": plan["is_stockout_risk"],
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }

    def evaluate(self, result: dict):
        """Step 4: Update state, log audit trail, and handle alerts."""
        if result["status"] == "SKIPPED":
            return
            
        self.synced_events.add(result["event_id"])
        
        if result.get("stockout_flag"):
            print(f"⚠️ [ALERT] Critical Stockout Avoided for {result['sku']}! Zero inventory updated on store.")
        else:
            print(f"✅ [SUCCESS] Inventory synced cleanly. HMAC: {result['signature'][:12]}...")

    def run(self, max_iterations: int = 2):
        """Main Autonomous Loop Execution Engine"""
        print("🚀 Starting SyncPulse Autonomous Sync Loop...")
        iteration = 0
        
        while self.is_running and iteration < max_iterations:
            iteration += 1
            print(f"\n--- [SYNC LOOP ITERATION {iteration}] ---")
            
            events = self.observe()
            
            if not events:
                print("[LOOP] No inventory deltas detected. Waiting...")
            else:
                for event in events:
                    plan = self.orient_and_plan(event)
                    result = self.act(plan)
                    self.evaluate(result)
            
            time.sleep(self.check_interval_seconds)
            
        print("\n🏁 SyncPulse Loop Engine safely paused.")

if __name__ == "__main__":
    engine = SyncPulseAgentLoop(check_interval_seconds=1)
    engine.run(max_iterations=1)
