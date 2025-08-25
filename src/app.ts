import * as aws from "aws-sdk";
import { Hono } from "hono";
import { cors } from "hono/cors";
import * as sql from "mssql";
import fetch from "node-fetch";
import config from "./config.json";
import { makeApiCall } from "./fanout.js";

const app = new Hono();

// Configure AWS
aws.config.update({ region: "ap-southeast-1" });
const ses = new aws.SES({ region: "us-west-2" });
const sns = new aws.SNS({ apiVersion: "2010-03-31" });

// SQL Configuration
const sqlConfig = {
  user: config.dbuser,
  password: config.dbpassword,
  server: config.dbhost,
  database: config.dbname,
  options: {
    encrypt: true,
  },
} as sql.config;

// CORS middleware
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    credentials: true,
  })
);

app.post("/bt-json", async (c) => {
  try {
    const body = await c.req.json();
    console.log(body);

    let temp_result = "";
    let temp_count = 0;
    let temp_command = "";

    const pool = new sql.ConnectionPool(sqlConfig);
    await pool.connect();

    const request = new sql.Request(pool);

    // Process parameters
    for (const item in body) {
      if (temp_count === 0) {
        temp_command = body[item];
        temp_count++;
      } else {
        request.input(item, body[item]);
      }
    }

    // Execute stored procedure
    const result = await request.execute(temp_command);
    temp_result = result.recordset;

    // Handle different command types
    if (
      [
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
      ].includes(temp_command)
    ) {
      await processWhatsAppMessages(temp_result, temp_command);

      if (
        [
          "update_order_complete",
          "update_order_collection",
          "update_order_collection_direct",
        ].includes(temp_command)
      ) {
        await processShopifyOrderComplete(temp_result);
      }

      await pool.close();
      return c.json({ message: temp_result });
    } else if (temp_command === "insert_order_whatsapp") {
      const whatsappResult = await sendWhatsAppMessage(temp_result[0]);
      await pool.close();
      return c.json({ success: whatsappResult });
    } else if (
      [
        "update_order_custom_billing",
        "update_order_delivery",
        "update_order_card_shipping",
        "update_order_shipping_details",
      ].includes(temp_command)
    ) {
      const shopifyResult = await processShopifyUpdate(
        temp_command,
        temp_result[0]
      );
      await pool.close();
      return c.json({ success: shopifyResult, id: temp_result[0]?.id });
    } else if (
      [
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
      ].includes(temp_command)
    ) {
      await processMessaging(temp_result);
      await pool.close();
      return c.json({ message: temp_result });
    } else if (
      [
        "whatsapp_purchase_report",
        "update_inventory_purchase_supply_confirm",
        "update_inventory_purchase_confirm",
        "update_requisition_approvals_telegram",
      ].includes(temp_command)
    ) {
      await processTelegramMessages(temp_result);
      await pool.close();
      return c.json({ message: temp_result });
    } else if (temp_command === "get_order_delivered") {
      await processShopifyOrderComplete(temp_result);
      await pool.close();
      return c.json({ message: temp_result });
    } else if (temp_command === "update_inventory_log_pr_ids") {
      const updateRequest = new sql.Request(pool);
      updateRequest.input("pr_id", body.pr_id);
      updateRequest.input("log_ids", body.log_ids);
      const updateResult = await updateRequest.execute(
        "update_inventory_log_pr_ids"
      );

      await pool.close();
      return c.json({
        success: true,
        updatedCount: updateResult.rowsAffected[0],
      });
    } else {
      await pool.close();
      return c.json({ message: temp_result });
    }
  } catch (error) {
    console.error("[Error]", error);
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Helper functions
async function processWhatsAppMessages(messages: any[], command: string) {
  for (const msg of messages) {
    try {
      const params = {
        Message: JSON.stringify({
          apikey: "ace4ddad6fbe46b4aea9fb8a0ce907fc",
          phone: msg.dest,
          message: msg.message,
          command: command,
          shipping_province: msg.shipping_province,
        }),
        TopicArn:
          "arn:aws:sns:ap-southeast-1:530748919589:send_message_whatsapp",
      };

      await sns.publish(params).promise();
    } catch (e) {
      console.error("WhatsApp message error:", e);
    }
  }
}

async function processShopifyOrderComplete(messages: any[]) {
  for (const msg of messages) {
    if (msg.id) {
      try {
        const params = {
          Message: JSON.stringify({
            shipping_country: msg.shipping_country,
            location_id: msg.location_id,
            id: msg.id,
          }),
          TopicArn:
            "arn:aws:sns:ap-southeast-1:530748919589:mark_shopify_order_complete",
        };

        await sns.publish(params).promise();
      } catch (e) {
        console.error("Shopify order complete error:", e);
      }
    }
  }
}

async function sendWhatsAppMessage(data: any): Promise<boolean> {
  try {
    const response = await fetch("https://api.watext.com/hook/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: "ace4ddad6fbe46b4aea9fb8a0ce907fc",
        phone: data.whatsapp_phone,
        message: data.whatsapp_message,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("WhatsApp API error:", error);
    return false;
  }
}

async function processShopifyUpdate(
  command: string,
  data: any
): Promise<boolean> {
  try {
    let postData: any = {};

    // Send notifications to DingTalk and Google Chat
    if (
      [
        "update_order_card_shipping",
        "update_order_delivery",
        "update_order_shipping_details",
      ].includes(command)
    ) {
      const message = `[UPDATE] Order ${data.order_id} - ${data.remarks}`;

      // DingTalk notification
      await fetch(config.MYDINGTALK_OPS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          msgtype: "text",
          text: { content: message },
        }),
      });

      // Google Chat notification
      await fetch(config.MYGOOGLECHAT_OPS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message }),
      });
    }

    // Prepare Shopify update data
    if (
      command === "update_order_card_shipping" ||
      command === "update_order_delivery"
    ) {
      postData = {
        order: {
          id: data.id,
          note: data.message_card,
          note_attributes: [
            { name: "Delivery Date", value: data.delivery_date },
            { name: "Delivery Session", value: data.delivery_time },
            { name: "Shipping", value: data.delivery_type },
          ],
        },
      };
    } else if (command === "update_order_shipping_details") {
      postData = {
        order: {
          id: data.id,
          shipping_address: {
            address1: data.shipping_address1,
            address2: data.shipping_address2,
            city: data.shipping_city,
            company: data.shipping_company,
            first_name: data.shipping_name,
            last_name: data.shipping_lastname,
          },
        },
      };
    } else if (command === "update_order_custom_billing") {
      postData = {
        order: {
          id: data.id,
          note: data.message_card,
          note_attributes: [
            { name: "Delivery Date", value: data.delivery_date },
            { name: "Delivery Session", value: data.delivery_session },
            { name: "Shipping", value: data.delivery_type },
            { name: "Custom Billing", value: data.custom_billing },
          ],
        },
      };
    }

    // Update Shopify order
    const shopifyUrl =
      data.shipping_country === "MY"
        ? `https://${config.MYSTORE_DOMAIN}/admin/orders/${data.id}.json`
        : `https://${config.SGSTORE_DOMAIN}/admin/orders/${data.id}.json`;

    const token =
      data.shipping_country === "MY" ? config.MYTOKEN : config.SGTOKEN;

    const response = await fetch(shopifyUrl, {
      method: "PUT",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postData),
    });

    return response.ok;
  } catch (error) {
    console.error("Shopify update error:", error);
    return false;
  }
}

async function processMessaging(messages: any[]) {
  for (const msg of messages) {
    try {
      let topicArn = "";
      let messageData: any = {};

      if (msg.type === "dingtalk") {
        topicArn =
          "arn:aws:sns:ap-southeast-1:530748919589:send_message_dingtalk";
        messageData = { channel: msg.channel, message: msg.message };
      } else if (msg.type === "telegram") {
        topicArn =
          "arn:aws:sns:ap-southeast-1:530748919589:send_message_telegram";
        messageData = { channel: msg.channel, message: msg.message };
      } else if (msg.type === "googlechat") {
        topicArn =
          "arn:aws:sns:ap-southeast-1:530748919589:send_message_googlechat";
        messageData = { channel: msg.channel, message: msg.message };
      } else if (msg.type === "email") {
        topicArn = "arn:aws:sns:ap-southeast-1:530748919589:bt_email";
        messageData = {
          channel: msg.channel,
          subject: msg.subject,
          message: msg.message,
        };
        if (msg.channel2) {
          messageData.channel2 = msg.channel2;
        }
      } else if (msg.type === "email-nft") {
        topicArn = "arn:aws:sns:ap-southeast-1:530748919589:bt_email";
        messageData = {
          source1: msg,
          channel: msg.channel,
          subject: msg.subject,
          message: msg.message,
        };
      } else {
        topicArn =
          "arn:aws:sns:ap-southeast-1:530748919589:send_message_dingtalk";
        messageData = { channel: msg.channel, message: msg.message };
      }

      const params = {
        Message: JSON.stringify(messageData),
        TopicArn: topicArn,
      };

      await sns.publish(params).promise();
    } catch (e) {
      console.error("Messaging error:", e);
    }
  }
}

async function processTelegramMessages(messages: any[]) {
  for (const msg of messages) {
    try {
      const params = {
        Message: JSON.stringify({
          channel: msg.dest,
          message: msg.message,
        }),
        TopicArn:
          "arn:aws:sns:ap-southeast-1:530748919589:send_message_telegram",
      };

      await sns.publish(params).promise();
    } catch (e) {
      console.error("Telegram message error:", e);
    }
  }
}

// Call fanout API for all configured endpoints
app.use("*", async (c, next) => {
  await next();

  // Only run fanout for bt-json endpoint
  if (c.req.path === "/bt-json" && c.req.method === "POST") {
    const body = await c.req.json();
    const API_CONFIG = {
      production: "https://omni.sciplelabs.co",
    };

    Object.values(API_CONFIG).forEach((baseUrl) => {
      makeApiCall(baseUrl, body.command, body);
    });
  }
});

export default app;
