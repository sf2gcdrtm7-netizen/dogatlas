import crypto from "crypto";

function checkTelegramData(initData, botToken) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) return null;

  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (calculatedHash !== hash) return null;

  try {
    return JSON.parse(params.get("user"));
  } catch {
    return null;
  }
}

async function supabase(path, options = {}) {
  const response = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/${path}`,
    {
      ...options,
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...(options.headers || {})
      }
    }
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(text);
  }

  return text ? JSON.parse(text) : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({
      ok: true,
      message: "DogAtlas profile API is working"
    });
  }

  try {
    const { action, initData, breed_name, image_url } = req.body || {};

    const user = checkTelegramData(
      initData,
      process.env.BOT_TOKEN
    );

    if (!user) {
      return res.status(401).json({
        ok: false,
        error: "Telegram user verification failed"
      });
    }

    const telegramId = user.id;

    if (action === "upsert_profile") {
      const data = await supabase(
        "profiles?on_conflict=telegram_id",
        {
          method: "POST",
          headers: {
            Prefer: "resolution=merge-duplicates,return=representation"
          },
          body: JSON.stringify({
            telegram_id: telegramId,
            username: user.username || null,
            first_name: user.first_name || null,
            photo_url: user.photo_url || null
          })
        }
      );

      return res.status(200).json({
        ok: true,
        profile: data?.[0] || null
      });
    }

    if (action === "save_dog") {
      if (!breed_name || !image_url) {
        return res.status(400).json({
          ok: false,
          error: "Dog data missing"
        });
      }

      const data = await supabase("saved_dogs", {
        method: "POST",
        body: JSON.stringify({
          telegram_id: telegramId,
          breed_name,
          image_url
        })
      });

      return res.status(200).json({
        ok: true,
        dog: data?.[0] || null
      });
    }

if (action === "delete_dog") {
  const { id } = req.body || {};

  if (!id) {
    return res.status(400).json({
      ok: false,
      error: "Dog id missing"
    });
  }

  await supabase(
    `saved_dogs?id=eq.${id}&telegram_id=eq.${telegramId}`,
    {
      method: "DELETE"
    }
  );

  return res.status(200).json({
    ok: true
  });
}

if (action === "find_user") {
  const { username } = req.body || {};

  if (!username) {
    return res.status(400).json({
      ok: false,
      error: "Username missing"
    });
  }

  const cleanUsername = username.replace("@", "");

  const users = await supabase(
    `profiles?username=ilike.${encodeURIComponent(cleanUsername)}&limit=1`
  );

  const foundUser = users?.[0] || null;

  if (!foundUser) {
    return res.status(404).json({
      ok: false,
      error: "User not found"
    });
  }

  if (foundUser.telegram_id === telegramId) {
    return res.status(400).json({
      ok: false,
      error: "You cannot add yourself"
    });
  }

  return res.status(200).json({
    ok: true,
    user: foundUser
  });
}

if (action === "add_friend") {
  const { friend_telegram_id } = req.body || {};

  if (!friend_telegram_id) {
    return res.status(400).json({
      ok: false,
      error: "Friend id missing"
    });
  }

  if (friend_telegram_id === telegramId) {
    return res.status(400).json({
      ok: false,
      error: "You cannot add yourself"
    });
  }

  const existing = await supabase(
    `friends?telegram_id=eq.${telegramId}&friend_telegram_id=eq.${friend_telegram_id}&limit=1`
  );

  if (existing?.length) {
    return res.status(200).json({
      ok: false,
      error: "Request already exists"
    });
  }

  await supabase("friends", {
    method: "POST",
    body: JSON.stringify({
      telegram_id: telegramId,
      friend_telegram_id,
      status: "pending"
    })
  });

  return res.status(200).json({
    ok: true,
    status: "pending"
  });
}

if (action === "get_friend_requests") {
  const requests = await supabase(
    `friends?friend_telegram_id=eq.${telegramId}&status=eq.pending&order=created_at.desc`
  );

  if (!requests || requests.length === 0) {
    return res.status(200).json({
      ok: true,
      requests: []
    });
  }

  const ids = requests
    .map(item => item.telegram_id)
    .join(",");

  const users = await supabase(
    `profiles?telegram_id=in.(${ids})`
  );

  const result = requests.map(request => {
    const user = users.find(
      item => item.telegram_id === request.telegram_id
    );

    return {
      id: request.id,
      user
    };
  });

  return res.status(200).json({
    ok: true,
    requests: result
  });
}

if (action === "accept_friend") {
  const { request_id } = req.body || {};

  if (!request_id) {
    return res.status(400).json({
      ok: false,
      error: "Request id missing"
    });
  }

  const requests = await supabase(
    `friends?id=eq.${request_id}&friend_telegram_id=eq.${telegramId}&status=eq.pending&limit=1`
  );

  const request = requests?.[0];

  if (!request) {
    return res.status(404).json({
      ok: false,
      error: "Request not found"
    });
  }

  await supabase(
    `friends?id=eq.${request_id}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: "accepted"
      })
    }
  );

  return res.status(200).json({
    ok: true
  });
}

if (action === "get_friends") {
  const links = await supabase(
    `friends?status=eq.accepted&or=(telegram_id.eq.${telegramId},friend_telegram_id.eq.${telegramId})&order=created_at.desc`
  );

  if (!links || links.length === 0) {
    return res.status(200).json({
      ok: true,
      friends: []
    });
  }

  const ids = links.map(item => {
    return item.telegram_id === telegramId
      ? item.friend_telegram_id
      : item.telegram_id;
  });

  const friends = await supabase(
    `profiles?telegram_id=in.(${ids.join(",")})`
  );

  return res.status(200).json({
    ok: true,
    friends: friends || []
  });
}

    if (action === "get_profile") {
      const profile = await supabase(
        `profiles?telegram_id=eq.${telegramId}&limit=1`
      );

      const dogs = await supabase(
        `saved_dogs?telegram_id=eq.${telegramId}&order=created_at.desc`
      );

      return res.status(200).json({
        ok: true,
        profile: profile?.[0] || null,
        saved_dogs: dogs || []
      });
    }

    return res.status(400).json({
      ok: false,
      error: "Unknown action"
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: String(error)
    });
  }
}