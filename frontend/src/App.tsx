import { useState } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  useParams,
} from "react-router-dom";
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";
import exampleOutput from "./example-output.json";

const CATEGORY_MAP = {
  restaurant: {
    name: "Restaurant",
    placeholder: "is Japanese, has fresh sushi, and has outdoor seating",
  },
  dentist: {
    name: "Dentist",
    placeholder:
      "is in-network, has good reviews, and is accepting new patients",
  },
  bar: {
    name: "Bar",
    placeholder: "has outdoor seating, has good reviews, and is open late",
  },
  salon: {
    name: "Beauty Salon",
    placeholder: "can dye hair, has good reviews, and is accepting new clients",
  },
  doctor: {
    name: "Doctor",
    placeholder:
      "is in-network, has good reviews, and is accepting new patients",
  },
};

function Page() {
  const { category } = useParams<{ category: string }>();
  const [results, setResults] = useState(exampleOutput);
  const [loading, setLoading] = useState(false);

  const [prompt, setPrompt] = useState("");

  async function getRecommendations() {
    console.log("wtf");
    setLoading(true);
    const response = await fetch(
      `http://localhost:5002/recommendations/${category} that ${prompt}`
    );
    setLoading(false);
    const data = await response.json();
    console.log(data);
    setResults(data);
  }

  return (
    <div className="bg-orange-50 min-h-screen flex flex-col p-4">
      <div className="max-w-4xl mx-auto mt-16 w-full">
        <div className="text-lg mb-2 flex items-center">
          Find a
          <a
            className="rounded bg-orange-200 px-3 py-0.5 hover:bg-orange-300 mx-2"
            href="/"
          >
            {CATEGORY_MAP[category as keyof typeof CATEGORY_MAP].name}
          </a>
          that...
        </div>
        <div className="flex items-center mb-2">
          <input
            autoFocus
            className="bg-transparent outline-none w-[480px] text-lg"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
            }}
            placeholder={
              CATEGORY_MAP[category as keyof typeof CATEGORY_MAP].placeholder
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                getRecommendations();
              }
            }}
          />
          <PaperAirplaneIcon
            className="w-5 h-5 text-orange-300 hover:text-orange-400 cursor-pointer"
            onClick={() => {
              getRecommendations();
            }}
          />
        </div>
        {loading && <div className="text-slate-400">Loading...</div>}
        <div className="mt-4">
          {results.map((result: any) => {
            return (
              <div className="flex space-x-4">
                <img
                  className="w-40 h-40 rounded shrink-0"
                  src={result.primary_photo}
                ></img>
                <div className="flex flex-col">
                  <h2 className="font-semibold text-xl">
                    {result.business_name}
                  </h2>
                  <div>{result.review_count}</div>
                  <div className="flex space-x-2">
                    {result.categories.map((category: string) => {
                      return (
                        <span className="bg-black/5 px-2 rounded">
                          {category}
                        </span>
                      );
                    })}
                  </div>
                  <div>{result.c1_name}</div>
                  <div className="h-3 w-64 bg-black/5 rounded">
                    <div
                      className="h-3 bg-green-500 rounded"
                      style={{
                        width: `${(parseFloat(result.c1_score) / 5) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <div>{result.c1_evidence}</div>
                  <div>{result.c2_name}</div>
                  <div className="h-3 w-64 bg-gray-200 rounded">
                    <div
                      className="h-3 bg-blue-500 rounded"
                      style={{
                        width: `${(parseFloat(result.c2_score) / 5) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <div>{result.c2_evidence}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <div className="bg-orange-50 min-h-screen flex flex-col p-4">
        <div className="max-w-4xl mx-auto mt-16 w-full">
          <div className="text-lg mb-2">Find a...</div>
          <div className="flex space-x-2 text-lg">
            <a
              className="rounded bg-orange-200 px-3 py-0.5 hover:bg-orange-300"
              href="/restaurant"
            >
              Restaurant
            </a>
            <a
              className="rounded bg-blue-200 px-3 py-0.5 hover:bg-blue-300"
              href="/dentist"
            >
              Dentist
            </a>
            <a
              className="rounded bg-yellow-200 px-3 py-0.5 hover:bg-yellow-300"
              href="/bar"
            >
              Bar
            </a>
            <a
              className="rounded bg-red-200 px-3 py-0.5 hover:bg-red-300"
              href="/salon"
            >
              Beauty Salon
            </a>
            <a
              className="rounded bg-green-200 px-3 py-0.5 hover:bg-green-300"
              href="/doctor"
            >
              Doctor
            </a>
          </div>
        </div>
      </div>
    ),
  },
  {
    path: "/:category",
    element: <Page />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
