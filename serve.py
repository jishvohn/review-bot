import json

import quart
import quart_cors
from quart import request

# Note: Setting CORS to allow chat.openapi.com is only required when running a localhost plugin
app = quart_cors.cors(quart.Quart(__name__), allow_origin="https://chat.openai.com")


@app.get("/recommendations/<string:prompt>")
async def get_recommendations(prompt):
    # Do your shit
    return quart.Response(
        response="""Kothai Republic
4.5 stars
Hours: 5:30 PM - 9:30 PM
Description: Korean and Thai flavors served in a uniquely San Francisco way
Summary of reviews: Very good kimchi and soups.

KAIYO Rooftop
4.2 stars
Hours: 4:00 PM - 11:00 PM
Description: KAIYŌ Rooftop is a tropical oasis in the sky, an immersive Nikkei experience that transports guests
the moment they walk through the elevator door.
Summary of reviews: Great service, nice heating lamps. Lovely ambiance fit for a date.

The Snug
4.3 stars
Hours: 12:00 PM - 10:00 PM
Unique cocktails, local beer, small-producer wines, and modern Californian comfort food -- all
served up in a warm and comfortable environment.
Summary of reviews: Self-serve QR code ordering system which you order from and the food is brought directly to the table where you scanned your code. Outdoor dining space.
""",
        status=200,
    )


@app.get("/logo.png")
async def plugin_logo():
    filename = "logo.png"
    return await quart.send_file(filename, mimetype="image/png")


@app.get("/.well-known/ai-plugin.json")
async def plugin_manifest():
    host = request.headers["Host"]
    with open("ai-plugin.json") as f:
        text = f.read()
        # This is a trick we do to populate the PLUGIN_HOSTNAME constant in the manifest
        text = text.replace("PLUGIN_HOSTNAME", f"http://{host}")
        return quart.Response(text, mimetype="text/json")


@app.get("/openapi.yaml")
async def openapi_spec():
    host = request.headers["Host"]
    with open("openapi.yaml") as f:
        text = f.read()
        # This is a trick we do to populate the PLUGIN_HOSTNAME constant in the OpenAPI spec
        text = text.replace("PLUGIN_HOSTNAME", f"http://{host}")
        return quart.Response(text, mimetype="text/yaml")


def main():
    app.run(debug=True, host="0.0.0.0", port=5002)


if __name__ == "__main__":
    main()
