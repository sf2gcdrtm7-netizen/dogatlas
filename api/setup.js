export default async function handler(req, res) {
  try {
    const token = process.env.BOT_TOKEN;

    if (!token) {
      return res.status(500).json({
        ok: false,
        error: "BOT_TOKEN не найден в Vercel"
      });
    }

    const webhookUrl =
      "https://dogatlas.vercel.app/api/bot";

    // Проверяем токен
    const meResponse = await fetch(
      `https://api.telegram.org/bot${token}/getMe`
    );

    const me = await meResponse.json();

    if (!me.ok) {
      return res.status(500).json({
        ok: false,
        step: "getMe",
        telegram: me
      });
    }

    // Устанавливаем webhook
    const hookResponse = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url: webhookUrl
        })
      }
    );

    const hook = await hookResponse.json();

    // Смотрим состояние webhook
    const infoResponse = await fetch(
      `https://api.telegram.org/bot${token}/getWebhookInfo`
    );

    const info = await infoResponse.json();

    return res.status(200).json({
      bot: me.result?.username,
      webhook_set: hook,
      webhook_info: info
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: String(error)
    });
  }
}
