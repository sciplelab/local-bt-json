import { ShopifyOrderData } from "../types/index.js";

export async function processShopifyOrderComplete(
  messages: any[]
): Promise<void> {
  console.log("processShopifyOrderComplete", { messageCount: messages.length });
  // TODO: Implement Shopify order completion processing logic
}

export async function processShopifyUpdate(
  command: string,
  data: ShopifyOrderData
): Promise<boolean> {
  try {
    let postData: any = {};

    if (
      [
        "update_order_card_shipping",
        "update_order_delivery",
        "update_order_shipping_details",
      ].includes(command)
    ) {
      const message = `[UPDATE] Order ${data.order_id} - ${data.remarks}`;

      // TODO: Uncomment when ready to enable notifications
      // await sendDingTalkNotification(message);
      // await sendGoogleChatNotification(message);
    }

    postData = buildShopifyUpdatePayload(command, data);

    const shopifyUrl = getShopifyUrl(data);
    const token = getShopifyToken(data);

    // TODO: Uncomment when ready to enable Shopify updates
    // const response = await updateShopifyOrder(shopifyUrl, token, postData);
    // return response.ok;

    return true;
  } catch (error) {
    console.error("Shopify update error:", error);
    return false;
  }
}

function buildShopifyUpdatePayload(
  command: string,
  data: ShopifyOrderData
): any {
  if (
    command === "update_order_card_shipping" ||
    command === "update_order_delivery"
  ) {
    return {
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
  }

  if (command === "update_order_shipping_details") {
    return {
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
  }

  if (command === "update_order_custom_billing") {
    return {
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

  return {};
}

function getShopifyUrl(data: ShopifyOrderData): string {
  return data.shipping_country === "MY"
    ? `https://${process.env.MYSTORE_DOMAIN}/admin/orders/${data.id}.json`
    : `https://${process.env.SGSTORE_DOMAIN}/admin/orders/${data.id}.json`;
}

function getShopifyToken(data: ShopifyOrderData): string {
  return data.shipping_country === "MY"
    ? (process.env.MYTOKEN as string)
    : (process.env.SGTOKEN as string);
}
