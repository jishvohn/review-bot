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
    allow_origin=[
        "https://chat.openai.com",
        "http://localhost:5178",
        "http://localhost:5173",
    ],
)
apify_client = ApifyClient(os.getenv("APIFY_API_KEY"))
openai.api_key = os.getenv("OPENAI_API_KEY")
print(os.getenv("APIFY_API_KEY"))
print(openai.api_key)

print("WHAT THE FUCK")
print(os.getenv("APIFY_API_KEY"))
print(os.getenv("OPENAI_API_KEY"))

# Read the user query to see if they ask for certain characteristics or features of the business.
# If the user query above contains these characteristics on which to rank or evaluate this type of businesses,
# then you absolutely must use these characteristics and nothing else.

# Prompt Templates

characteristics_template = """
User query: {user_query}

The user query above is from a user who wants to find businesses that best match their query. 

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

Remember, you must output in the following format:

Characteristic 1: 
Characteristic 2: 
"""

template = """
User query: {user_query}
Characteristic 1: {c1}
Characteristic 2: {c2}

The user query above is from a customer who wants to find businesses that best match their query. 
Pretend you are the customer who wrote the user query above and wants to evaluate businesses
based on that query. I'm going to give you a set of reviews for a business. You need to evaluate this business
on the two characteristics above by examining these reviews (from other customers). 

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
    result = full_cache(prompt)
    print("FULL CACHE", result is not None)
    if result is not None:
        return quart.Response(json.dumps(result))

    user_query = prompt

    ct = PromptTemplate(
        input_variables=["user_query"],
        template=characteristics_template,
    )

    prompt = ct.format(user_query=user_query)
    params = {
        "engine": "text-davinci-003",
        "prompt": prompt,
        "max_tokens": 100,
        "temperature": 0.1,
    }

    response = openai.Completion.create(**params)
    raw_answer = response.choices[0].text
    semi_answer = []
    for a in raw_answer.split("\n"):
        if a != "":
            semi_answer.append(a)

    print(semi_answer)
    c1 = "".join(semi_answer[0].split(":")[1:]).strip()
    c2 = "".join(semi_answer[1].split(":")[1:]).strip()

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
        data = apify_client.dataset(actor_call["defaultDatasetId"]).list_items().items

    prompt_template = PromptTemplate(
        input_variables=[
            "user_query",
            "c1",
            "c2",
            "n",
            "r1",
            "r2",
            "r3",
            "r4",
            "r5",
            "r6",
            "r7",
            "r8",
        ],
        template=template,
    )

    final_responses = []

    for i, item in enumerate(data):
        n = item["name"]
        reviews = ["" for _ in range(10)]
        for j, review in enumerate(item["reviews"]):
            reviews[j] = review["text"]

        prompt = prompt_template.format(
            user_query=user_query,
            c1=c1,
            c2=c2,
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
        for a in raw_answer.split("\n"):
            if a != "":
                semi_answer.append(a)
        print(semi_answer)
        keys = [
            "business_name",
            "c1_name",
            "c1_score",
            "c1_evidence",
            "c2_name",
            "c2_score",
            "c2_evidence",
        ]
        final_response = {}
        for j, raw_val in enumerate(semi_answer):
            if j < len(keys):
                almost_val = "".join(raw_val.split(":")[1:]).strip()
                if "evidence" in keys[j]:
                    final_response[keys[j]] = almost_val.split(";")
                else:
                    final_response[keys[j]] = almost_val
        final_response["primary_photo"] = item["primaryPhoto"]
        final_response["review_count"] = item["reviewCount"]
        final_response["categories"] = item["categories"]
        final_response["operation_hours"] = item["operationHours"]
        final_response["aggregated_rating"] = item["aggregatedRating"]
        final_responses.append(final_response)

        print(final_responses)
        with open(f"data/{user_query}.json", "w") as f:
            json.dump(final_responses, f)

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
    cache_items = ["dentist", "vietnamese", "mediterranean"]
    for item in cache_items:
        if item in prompt:
            with open(f"data/{item}.json", "r") as f:
                return json.load(f)

def all_strings_present(list_of_strings, target_string):
    # Iterate over each string in the list
    for s in list_of_strings:
        # If the current string is not present in the target string, return False
        if s not in target_string:
            return False
    # If all strings are present, return True
    return True

def full_cache(prompt: str):
    cache_items = [['dentist', 'friendly front office'],
                   ['bar', 'fruity drinks', 'fun vibes'],
                   ['restaurant', 'mediterranean food', 'classy ambiance'],
                   ['doctor', 'patience', 'kids']
                   ]
    for item in cache_items:
        if all_strings_present(item, prompt):
            fn = '_'.join(['_'.join(s.split(' ')) for s in item])
            time.sleep(5)
            with open(f"data/{fn}.json", "r") as f:
                return json.load(f)


if __name__ == "__main__":
    main()
