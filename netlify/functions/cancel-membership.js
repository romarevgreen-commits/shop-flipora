const { json, authenticatedUser, rest } = require("./_shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const user = await authenticatedUser(event);

    await rest(`profiles?id=eq.${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ membership_active: false })
    });

    return json(200, {
      member: false,
      message: "Your Flipora membership has been cancelled. Seller payout access is now locked."
    });
  } catch (error) {
    console.error("Cancel membership error:", error);
    return json(400, { error: String(error.message || "Could not cancel membership") });
  }
};
