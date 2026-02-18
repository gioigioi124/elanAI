async function testChat() {
  try {
    const response = await fetch("http://localhost:3000/api/chatbot/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "Hello, testing connection" }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log("Error status:", response.status);
      console.log("Error body:", errorText);
    } else {
      const data = await response.json();
      console.log("Success:", data);
    }
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

testChat();
