import { MessageData } from "../types/index.js";

const SNS_TOPICS = {
  dingtalk: "arn:aws:sns:ap-southeast-1:530748919589:send_message_dingtalk",
  telegram: "arn:aws:sns:ap-southeast-1:530748919589:send_message_telegram",
  googlechat: "arn:aws:sns:ap-southeast-1:530748919589:send_message_googlechat",
  email: "arn:aws:sns:ap-southeast-1:530748919589:bt_email",
} as const;

export async function processMessaging(messages: any[]): Promise<void> {
  for (const msg of messages) {
    try {
      const { topicArn, messageData } = prepareMessageData(msg);

      const params = {
        Message: JSON.stringify(messageData),
        TopicArn: topicArn,
      };

      console.log("Publishing SNS message:", params);
      // TODO: Uncomment when ready to enable SNS publishing
      // await sns.publish(params).promise();
    } catch (e) {
      console.error("Messaging error:", e);
    }
  }
}

export async function processTelegramMessages(messages: any[]): Promise<void> {
  for (const msg of messages) {
    try {
      const params = {
        Message: JSON.stringify({
          channel: msg.dest,
          message: msg.message,
        }),
        TopicArn: SNS_TOPICS.telegram,
      };

      console.log("Telegram message published:", params);
      // TODO: Uncomment when ready to enable SNS publishing
      // await sns.publish(params).promise();
    } catch (e) {
      console.error("Telegram message error:", e);
    }
  }
}

function prepareMessageData(msg: MessageData): {
  topicArn: string;
  messageData: any;
} {
  let topicArn = "";
  let messageData: any = {};

  switch (msg.type) {
    case "dingtalk":
      topicArn = SNS_TOPICS.dingtalk;
      messageData = { channel: msg.channel, message: msg.message };
      break;

    case "telegram":
      topicArn = SNS_TOPICS.telegram;
      messageData = { channel: msg.channel, message: msg.message };
      break;

    case "googlechat":
      topicArn = SNS_TOPICS.googlechat;
      messageData = { channel: msg.channel, message: msg.message };
      break;

    case "email":
      topicArn = SNS_TOPICS.email;
      messageData = {
        channel: msg.channel,
        subject: msg.subject,
        message: msg.message,
      };
      if (msg.channel2) {
        messageData.channel2 = msg.channel2;
      }
      break;

    case "email-nft":
      topicArn = SNS_TOPICS.email;
      messageData = {
        source1: msg,
        channel: msg.channel,
        subject: msg.subject,
        message: msg.message,
      };
      break;

    default:
      topicArn = SNS_TOPICS.dingtalk;
      messageData = { channel: msg.channel, message: msg.message };
      break;
  }

  return { topicArn, messageData };
}
