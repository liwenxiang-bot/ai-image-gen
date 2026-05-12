import { createHash } from "crypto";
import { customAlphabet } from "nanoid";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const generateCode = customAlphabet(CODE_ALPHABET, 6);

export function randomLoginCode(): string {
  return generateCode();
}

export function verifySignature(
  token: string,
  timestamp: string | null,
  nonce: string | null,
  signature: string | null,
): boolean {
  if (!token || !timestamp || !nonce || !signature) return false;
  const sorted = [token, timestamp, nonce].sort().join("");
  const hash = createHash("sha1").update(sorted).digest("hex");
  return hash === signature;
}

export type WechatTextMessage = {
  ToUserName: string;
  FromUserName: string;
  CreateTime: string;
  MsgType: string;
  Content: string;
};

function extract(body: string, tag: string): string {
  const cdata = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`).exec(body);
  if (cdata) return cdata[1];
  const plain = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(body);
  return plain ? plain[1].trim() : "";
}

export function parseXml(body: string): WechatTextMessage {
  return {
    ToUserName: extract(body, "ToUserName"),
    FromUserName: extract(body, "FromUserName"),
    CreateTime: extract(body, "CreateTime"),
    MsgType: extract(body, "MsgType"),
    Content: extract(body, "Content"),
  };
}

function escapeCdata(content: string): string {
  return content.replace(/]]>/g, "]]]]><![CDATA[>");
}

export function buildReplyXml(opts: {
  toUser: string;
  fromUser: string;
  content: string;
}): string {
  const now = Math.floor(Date.now() / 1000);
  return `<xml>
<ToUserName><![CDATA[${opts.toUser}]]></ToUserName>
<FromUserName><![CDATA[${opts.fromUser}]]></FromUserName>
<CreateTime>${now}</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[${escapeCdata(opts.content)}]]></Content>
</xml>`;
}
