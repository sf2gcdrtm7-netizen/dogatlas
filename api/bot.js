export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(200).send("DogAtlas bot is working");
  }

  const update = req.body;

  if (!update?.message) {
    return res.status(200).json({ ok: true });
  }

  const chatId = update.message.chat.id;

  const text = update.message.text || "";

  if (text.startsWith("/dog")) {

    try {

      // Получаем случайное фото собаки
      const dogResponse = await fetch(
        "https://dog.ceo/api/breeds/image/random"
      );

      const dogData = await dogResponse.json();

      const photo = dogData.message;

      // Отправляем фото пользователю
      await fetch(
        `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendPhoto`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            chat_id: chatId,
            photo: photo,
            caption: "Твоя собака на сегодня 🐶💛"
          })
        }
      );

    }

    catch (error) {

      await fetch(
        `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: "Ой, собака куда-то убежала 🐕 Попробуй ещё раз!"
          })
        }
      );

    }

  }

  return res.status(200).json({ ok: true });

}
