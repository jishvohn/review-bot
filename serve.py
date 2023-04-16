import json
import time
import os
import quart
import quart_cors
import openai
from quart import request

from apify_client import ApifyClient
from langchain import PromptTemplate

# Note: Setting CORS to allow chat.openapi.com is only required when running a localhost plugin
app = quart_cors.cors(
    quart.Quart(__name__),
    allow_origin=["https://chat.openai.com", "http://localhost:5178", "http://localhost:5173"],
)
apify_client = ApifyClient(os.getenv("APIFY_API_KEY"))
openai.api_key = os.getenv("OPENAI_API_KEY")
print(os.getenv('APIFY_API_KEY'))
print(openai.api_key)

print("WHAT THE FUCK")
print(os.getenv("APIFY_API_KEY"))
print(os.getenv("OPENAI_API_KEY"))

# Read the user query to see if they ask for certain characteristics or features of the business.
# If the user query above contains these characteristics on which to rank or evaluate this type of businesses,
# then you absolutely must use these characteristics and nothing else.

# Prompt Template
template = """
User query: {user_query}

I'm going to give you a set of reviews for a business. 
Based on the user query, I want you to determine what industry the business belongs in. 

Pretend you are the person who wrote the user query above and wants to evaluate businesses
based on that query. Generate two characteristics or evaluation measures from this user query. You will use
these to evaluate the business by reading its reviews from other customers. For example if the user query
has to do with food or restaurants with great decor, pretend you are that very person who wants restaurants
with great decor. The characteristic you will generate first may be ambiance or decor. The second characteristic
may be deliciousness.

If the user query is vague with no details or characteristics, then use the default values below for each type of business:then use your best judgment to come up with 
Restaurant/food businesses: Deliciousness & Service
Medical businesses: Quality of care & Bedside manner
Haircuts/Barbers/Salons: Customer satisfaction & quality of care

If the default values above don't match the business from the user query, then use your best judgment
to come up with two important characteristics by which this type of business should be evaluated. 

The main way you will evaluate the business on the above characteristics is by examining 
its reviews. For each characteristic, you will use the reviews to provide a decimal score out of 5 
for that characteristic as well as the most relevant snippets of text from the reviews 
that provide evidence for your rating. 

Assume that the current time is Sunday, 11:30 am. 

Each review is in the following format:
---
Review Text: 

Here are the reviews for the business {n}:

---
Review Text: {r1}
---
Review Text: {r2}
---
Review Text: {r3}
---
Review Text: {r4}
---
Review Text: {r5}
---
Review Text: {r6}
---
Review Text: {r7}
---
Review Text: {r8}

Remember you must output the following format:
Name of Business:
Name of characteristic 1: 
Score of characteristic 1: 
Evidence for characteristic 1, i.e relevant text snippets from reviews separated by semicolon: 
Name of characteristic 2:
Score of characteristic 2: 
Evidence for characteristic 2, i.e relevant text snippets from reviews separated by semicolon: 
"""


@app.get("/recommendations/<string:prompt>")
async def get_recommendations(prompt):
    # Do it
    user_query = prompt
    s = time.time()
    print("Received prompt", prompt)
    data = cache(prompt)
    if data is None:
        actor_call = apify_client.actor("yin/yelp-scraper").call(
            run_input={
                "searchTerms": [user_query],
                "locations": ["94105"],
                "searchLimit": 5,
                "reviewLimit": 5,
            }
        )
        print(f"Time elapsed for apify call: {time.time() - s} seconds")
        data = (
            apify_client.dataset(actor_call["defaultDatasetId"]).list_items().items
        )

    prompt_template = PromptTemplate(
        input_variables=["user_query", "n", "r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8"],
        template=template,
    )

    final_responses = []

    for i, item in enumerate(data):
        n = item["name"]
        reviews = ['' for _ in range(10)]
        for j, review in enumerate(item["reviews"]):
            reviews[j] = review["text"]

        prompt = prompt_template.format(
            user_query=user_query,
            n=n,
            r1=reviews[0],
            r2=reviews[1],
            r3=reviews[2],
            r4=reviews[3],
            r5=reviews[4],
            r6=reviews[5],
            r7=reviews[6],
            r8=reviews[7],
        )
        params = {
            "engine": "text-davinci-003",
            "prompt": prompt,
            "max_tokens": 450,
            "temperature": 0.1,
        }

        # Send the request to the API and get back the response
        s = time.time()
        response = openai.Completion.create(**params)
        print(f"Time elapsed for openai call: {time.time() - s} seconds")
        raw_answer = response.choices[0].text
        semi_answer = []
        for a in raw_answer.split('\n'):
            if a != '':
                semi_answer.append(a)
        print(semi_answer)
        keys = ["business_name", "c1_name", "c1_score", "c1_evidence", "c2_name", "c2_score", "c2_evidence"]
        final_response = {}
        for j, raw_val in enumerate(semi_answer):
            if j < len(keys):
                final_response[keys[j]] = "".join(raw_val.split(":")[1:]).strip()
        final_response["primary_photo"] = item["primaryPhoto"]
        final_response["review_count"] = item["reviewCount"]
        final_response["categories"] = item["categories"]
        final_response["operation_hours"] = item["operationHours"]
        final_response["aggregated_rating"] = item["aggregatedRating"]
        final_responses.append(final_response)

    return quart.Response(json.dumps(final_responses))


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
    app.run(debug=True, host="0.0.0.0", port=5003)

def cache(prompt: str):
    cache_items = ['dentist', 'vietnamese', 'mediterranean']
    for item in cache_items:
        if item in prompt:
            with open(f"data/{item}.json", "r") as f:
                return json.load(f)


if __name__ == "__main__":
    print("Wtf1")
    main()
    print("wtf2")

