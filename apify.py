import os
from apify_client import ApifyClient
import json
import pdb
import openai
from langchain import PromptTemplate

apify_client = ApifyClient(os.getenv("APIFY_API_KEY"))
openai.api_key = os.getenv("OPENAI_API_KEY")

USER_QUERY = "dentist"

# Start an actor and waits for it to finish
actor_call = apify_client.actor("yin/yelp-scraper").call(
    run_input={
        "searchTerms": [USER_QUERY],
        "locations": ["94105"],
        "searchLimit": 5,
        "reviewLimit": 10,
    }
)
# Fetch results from the actor's default dataset
dataset_items = apify_client.dataset(actor_call["defaultDatasetId"]).list_items().items

print(f"Number of businesses reviewed: {len(dataset_items)}")
print(f"Number of reviews for first one: {len(dataset_items[0]['reviews'])}")
print(f"{dataset_items[0]['reviews'][0]['text']}")
print(f"{dataset_items[0]['reviews'][1]['text']}")
print(f"{dataset_items[1]['reviews'][2]['text']}")

with open('data/dentist.json', 'w') as json_file:
    json.dump(dataset_items, json_file)

with open('data/dentist.json', 'r') as json_file:
    data = json.load(json_file)

# check that data has the stuff
# pdb.set_trace()
# print(5)

template = """
User query: {user_query}

Based on the user query, I want you to determine what industry the business belongs in. 
I'm going to give you several businesses and a set of reviews for each business. 

If the user query above contains characteristics on which to rank or evaluate these businesses, then
use those characteristics. (For example, for a restaurant, the user may prioritize 
ambiance followed by deliciousness of the food which are two characteristics that you want to evaluate
using the reviews). 

If the user query does not contain characteristics, then use your best judgment to come up with 
two important characteristics by which this type of business should be evaluated. For instance, for 
doctors or medical offices, this may be bedside manner, back office communication and/or correctness 
of diagnosis.

The main way you will evaluate each business on the above characteristics is by examining 
its reviews. For each characteristic, you will use the reviews to provide a decimal score out of 5 
for that characteristic as well as the most relevant snippets of text from the reviews 
that provide evidence for your rating. 

Each review is in the following format:
Review Text: 

Here are the reviews for the business {n}:

Review Text: r1

Review Text: r2

Review Text: r3 

Review Text: r4 

Review Text: r5

Remember, for each business you must output the following format:
Name of Business:
Score of characteristic 1: 
Evidence for characteristic 1, i.e text snippets from reviews: 
Score of characteristic 2: 
Evidence for characteristic 2, i.e text snippets from reviews: 
"""

# prompt = PromptTemplate(
#     input_variables=["user_query", "n", "r1", "r2", "r3", "r4", "r5"],
#     template=template,
# )

# dataset_items is a list of dictionaries-- it has the following keys in its dictionary:
# dict_keys(['directUrl', 'bizId', 'name', 'since', 'phone', 'amenitiesAndMore', 'healthScore',
# 'operationHours', 'upcomingSpecialHours', 'website', 'images', 'address', 'type', 'primaryPhoto',
# 'priceRange', 'cuisine', 'categories', 'aggregatedRating', 'reviewCount', 'businessHighlights',
# 'scrapeFinishedAt', 'reviews', 'availableReviewsLanguages'])

# dataset_items[0]['reviews'][0].keys() ===
# dict_keys(['date', 'rating', 'text', 'language', 'isFunnyCount', 'isUsefulCount', 'isCoolCount',
# 'photoUrls', 'reviewerName', 'reviewerUrl', 'reviewerReviewCount', 'reviewerLocation'])

# for item in dataset_items:
#     n = item["name"]
#     reviews = []
#     for review in item["reviews"]:
#         reviews.append(review["text"])
#
#     prompt.format(
#         user_query=USER_QUERY,
#         n=n,
#         r1=reviews[0],
#         r2=reviews[1],
#         r3=reviews[2],
#         r4=reviews[3],
#         r5=reviews[4],
#     )
#
#
# print(dataset_items)
# pdb.set_trace()
# print(5)
