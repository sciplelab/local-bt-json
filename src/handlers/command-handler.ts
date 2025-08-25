import { Context } from "hono";
import { CommandParameters } from "../types/index.js";
import { databaseService } from "../database.js";
import { processWhatsAppMessages, sendWhatsAppMessage } from "../processors/whatsapp.js";
import { processShopifyOrderComplete, processShopifyUpdate } from "../processors/shopify.js";
import { processMessaging, processTelegramMessages } from "../processors/messaging.js";

const WHATSAPP_COMMANDS = [
  "whatsapp_order_report_florist",
  "whatsapp_order_report",
  "whatsapp_order_drivers",
  "whatsapp_order_processing",
  "update_order_arrival_selfpickup",
  "whatsapp_order_complete",
  "update_order_rider",
  "update_order_arrival",
  "update_order_arrival_direct",
  "update_order_collection",
  "update_order_collection_direct",
  "update_order_complete_direct",
  "update_order_complete",
];

const SHOPIFY_COMPLETION_COMMANDS = [
  "update_order_complete",
  "update_order_collection",
  "update_order_collection_direct",
];

const SHOPIFY_UPDATE_COMMANDS = [
  "update_order_custom_billing",
  "update_order_delivery",
  "update_order_card_shipping",
  "update_order_shipping_details",
];

const MESSAGING_COMMANDS = [
  "insert_user",
  "update_order_nft",
  "whatsapp_order_report_cake",
  "update_request_complete",
  "update_claim_complete",
  "update_claim_assignee",
  "update_request_assignee",
  "update_requisition_request",
  "alert_no_update_purchase_order",
  "update_purchase_receive_details",
  "update_risk_list",
  "update_order_risk",
  "insert_order_substitution",
  "update_request_substitution",
  "update_request_approvals",
  "update_refund_approvals",
  "insert_request_form",
  "insert_refund_form",
  "insert_claim_form",
  "update_requisition_approvals",
  "insert_requisition_request",
  "update_flower_receive_item_qty",
  "insert_return_request",
  "update_return_request",
  "dingtalk_order_report",
  "dingtalk_report",
  "dingtalk_message",
  "insert_ticket_message",
  "insert_flower_standing_order",
  "insert_ticket",
  "insert_transfer_request",
  "update_transfer_request",
  "dingtalk_check_stock_transfer",
];

const TELEGRAM_COMMANDS = [
  "whatsapp_purchase_report",
  "update_inventory_purchase_supply_confirm",
  "update_inventory_purchase_confirm",
  "update_requisition_approvals_telegram",
];

export async function handleCommand(c: Context, command: string, parameters: CommandParameters, result: any[]) {
  try {
    if (WHATSAPP_COMMANDS.includes(command)) {
      return await handleWhatsAppCommand(c, command, result);
    }

    if (command === "insert_order_whatsapp") {
      return await handleWhatsAppInsert(c, result);
    }

    if (SHOPIFY_UPDATE_COMMANDS.includes(command)) {
      return await handleShopifyUpdate(c, command, result);
    }

    if (MESSAGING_COMMANDS.includes(command)) {
      return await handleMessaging(c, result);
    }

    if (TELEGRAM_COMMANDS.includes(command)) {
      return await handleTelegram(c, result);
    }

    if (command === "get_order_delivered") {
      return await handleOrderDelivered(c, result);
    }

    if (command === "update_inventory_log_pr_ids") {
      return await handleInventoryLogUpdate(c, parameters);
    }

    return c.json({ message: result });
  } catch (error) {
    console.error(`[Command Handler Error] ${command}:`, error);
    throw error;
  }
}

async function handleWhatsAppCommand(c: Context, command: string, result: any[]) {
  await processWhatsAppMessages(result, command);

  if (SHOPIFY_COMPLETION_COMMANDS.includes(command)) {
    await processShopifyOrderComplete(result);
  }

  return c.json({ message: result });
}

async function handleWhatsAppInsert(c: Context, result: any[]) {
  const whatsappResult = await sendWhatsAppMessage(result[0]);
  return c.json({ success: whatsappResult });
}

async function handleShopifyUpdate(c: Context, command: string, result: any[]) {
  const shopifyResult = await processShopifyUpdate(command, result[0]);
  return c.json({ success: shopifyResult, id: result[0]?.id });
}

async function handleMessaging(c: Context, result: any[]) {
  await processMessaging(result);
  return c.json({ message: result });
}

async function handleTelegram(c: Context, result: any[]) {
  await processTelegramMessages(result);
  return c.json({ message: result });
}

async function handleOrderDelivered(c: Context, result: any[]) {
  await processShopifyOrderComplete(result);
  return c.json({ message: result });
}

async function handleInventoryLogUpdate(c: Context, parameters: CommandParameters) {
  const updateResult = await databaseService.executeStoredProcedure(
    "update_inventory_log_pr_ids",
    {
      pr_id: parameters.pr_id,
      log_ids: parameters.log_ids,
    }
  );

  return c.json({
    success: true,
    updatedCount: updateResult.rowsAffected[0],
  });
}