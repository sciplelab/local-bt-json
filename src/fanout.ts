// API Endpoint definitions
import request from "request";

const ENDPOINTS = {
  // Abbas
  update_order_production_assign: {
    path: "/api/florist/task/assign",
    prepareData: (data) => ({
      lineItemIds: data.line_item_id,
      floristId: data.production_id,
    }),
  },
  update_order_production_complete: {
    path: "/api/florist/task/complete-by-sv",
    prepareData: (data) => ({
      lineItemIds: data.line_item_id,
    }),
  },
  update_order_production_unassign: {
    path: "/api/florist/task/unassign",
    prepareData: (data) => ({
      lineItemIds: data.line_item_id,
    }),
  },
  update_order_production_undone: {
    path: "/api/florist/task/undone-by-sv",
    prepareData: (data) => ({
      lineItemIds: data.line_item_id,
    }),
  },
  update_order_production_complete_by_user: {
    path: "/api/florist/task/complete",
    prepareData: (data) => ({
      lineItemId: data.item_id,
    }),
  },
  update_order_procurement_assign: {
    path: "/api/orders/black-mark",
    prepareData: (data) => ({
      lineItemIds: data.line_item_ids,
      orderIds: data.order_ids,
      reason: data.reason || "Order moved to DO NOT ROUTE",
    }),
  },
  update_order_procurement_unassign: {
    path: "/api/orders/un-black-mark",
    prepareData: (data) => ({
      lineItemIds: data.line_item_ids,
      orderIds: data.order_ids,
    }),
  },

  update_order_card_shipping_bypass: {
    path: "/api/orders/date-amendment",
    prepareData: (data) => ({
      orderId: data.order_id,
      deliveryDate: data.delivery_date,
    }),
  },

  update_order_card_shipping: {
    path: "/api/orders/date-amendment",
    prepareData: (data) => ({
      orderId: data.order_id,
      deliveryDate: data.delivery_date,
    }),
  },
  update_order_rider: {
    path: "/api/orders/update-delivery-time",
    prepareData: (data) => ({
      orderIds: data.order_ids,
      pickupTime: data.pickup_time,
      actor: data.actor,
    }),
  },
  // khairin, 28/5 5.16pm
  update_order_unassign: {
    path: "/api/orders/update-delivery-time",
    prepareData: (data) => ({
      orderIds: data.order_id,
      command: "update_order_unassign",
      user: data.user,
      pickupTime: null,
    }),
  },
};

// Generic API call function
export const makeApiCall = (baseUrl: string, endpoint: string, data: any) => {
  const endpointConfig = ENDPOINTS[endpoint];
  if (!endpointConfig) {
    console.error(`Unknown endpoint: ${endpoint}`);
    return;
  }

  //Logging for blackmark notification troubleshooting
  if (endpoint === "update_order_procurement_assign") {
    console.log("Processing black-mark request:", JSON.stringify(data));
  }

  try {
    const response = await fetch(`${baseUrl}${endpointConfig.path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(endpointConfig.prepareData(data)),
    });

    const body = await response.json();

    if (!response.ok) {
      console.log("Error:", response.status, response.statusText);
      return;
    }

    // Simple success logging for procurement assign
    if (endpoint === "update_order_procurement_assign") {
      console.log(
        "Black-mark request completed. Status:",
        response.status,
        "Response:",
        body
      );
    } else {
      console.log("Response body:", body);
    }
  } catch (err) {
    console.log("Exception:", err);
  }
};
