import { useState } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  useParams,
} from "react-router-dom";
import { PaperAirplaneIcon, StarIcon } from "@heroicons/react/24/solid";
import exampleOutput from "./example-output.json";

function stringifyDate(date) {
  const hours24 = date.getHours();
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minutes = date.getMinutes();
  const amPm = hours24 < 12 ? "AM" : "PM";

  const hoursStr = hours12.toString();
  const minutesStr = minutes.toString().padStart(2, "0");

  return `${hoursStr}:${minutesStr} ${amPm}`;
}

type TimeRange = {
  day: string;
  regularHours: string[] | null;
};

function getRestaurantStatus(
  currentTime: Date,
  schedule: TimeRange[]
): {
  isOpen: boolean;
  nextChange: Date;
} {
  function parseTime(timeStr: string): Date {
    const time = new Date(currentTime);
    const [hoursStr, minutesStr, amPm] = timeStr.split(/[:\s]+/);
    let hours = parseInt(hoursStr);
    const minutes = parseInt(minutesStr);

    if (amPm === "PM" && hours !== 12) {
      hours += 12;
    } else if (amPm === "AM" && hours === 12) {
      hours = 0;
    }

    time.setHours(hours, minutes, 0, 0);
    return time;
  }

  const currentDayIndex = currentTime.getDay();
  let isOpen = false;
  let nextChange: Date | null = null;

  for (let i = 0; i < 14; i++) {
    const scheduleIndex = (currentDayIndex + i) % 7;
    const hours = schedule[scheduleIndex].regularHours;

    if (hours) {
      for (const range of hours) {
        const [startStr, endStr] = range.split(" - ");
        const start = parseTime(startStr);
        const end = parseTime(endStr);

        if (i === 0 && start <= currentTime && currentTime <= end) {
          isOpen = true;
          nextChange = end;
          break;
        } else if (i > 0 && !nextChange) {
          nextChange = start;
          break;
        }
      }
    }

    if (nextChange) {
      break;
    }
  }

  return { isOpen, nextChange: nextChange as Date };
}

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
      `http://localhost:5003/recommendations/${category} with ${prompt}!!`
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
          with...
        </div>
        <div className="flex items-center mb-16 space-x-4">
          <input
            autoFocus
            className="bg-transparent outline-none w-[460px] text-lg placeholder:opacity-25 placeholder:text-black border-b border-black/20 focus:border-black"
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
            const restaurantStatus = getRestaurantStatus(
              new Date(),
              result.operation_hours
            );

            const wholeStars = Math.floor(result.aggregated_rating);
            const fraction = result.aggregated_rating % 1;

            return (
              <div className="flex space-x-4 mb-4" key={result.business_name}>
                <img
                  className="w-40 h-40 rounded shrink-0"
                  src={result.primary_photo}
                ></img>
                <div className="flex flex-col">
                  <h2 className="font-semibold text-xl">
                    {result.business_name}
                  </h2>
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex">
                      {Array.from({
                        length: wholeStars,
                      }).map((_, i) => {
                        return (
                          <StarIcon
                            className="h-4 w-4 text-orange-300"
                            key={i}
                          />
                        );
                      })}
                      {fraction > 0 && (
                        <StarIcon
                          className="h-4 w-4 text-orange-300"
                          style={{
                            WebkitMaskImage: `linear-gradient(90deg, black ${
                              fraction * 100
                            }%, transparent ${fraction * 100}%)`,
                          }}
                        />
                      )}
                    </div>
                    <div className="text-sm opacity-50">
                      {result.review_count}
                    </div>
                  </div>
                  <div className="flex space-x-2 mb-2">
                    {result.categories.map((category: string) => {
                      return (
                        <span
                          className="bg-black/5 px-2 rounded text-sm text-black/70"
                          key={category}
                        >
                          {category}
                        </span>
                      );
                    })}
                  </div>
                  <div className="mb-4 text-sm opacity-70">
                    {restaurantStatus.isOpen
                      ? `Open until ${stringifyDate(
                          restaurantStatus.nextChange
                        )}`
                      : `Closed until ${stringifyDate(
                          restaurantStatus.nextChange
                        )}`}
                  </div>
                  <div className="mb-1">
                    <span className="opacity-50">{result.c1_name}:</span>{" "}
                    <strong className="font-semibold">{result.c1_score}</strong>
                    <span className="opacity-50">/5</span>
                  </div>
                  <div className="h-3 w-64 bg-black/5 rounded mb-2">
                    <div
                      className="h-3 bg-green-500 rounded"
                      style={{
                        width: `${(parseFloat(result.c1_score) / 5) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <div className="mb-4 text-sm opacity-70">
                    {result.c1_evidence}
                  </div>
                  <div className="mb-1">
                    <span className="opacity-50">{result.c2_name}:</span>{" "}
                    <strong className="font-semibold">{result.c2_score}</strong>
                    <span className="opacity-50">/5</span>
                  </div>
                  <div className="h-3 w-64 bg-gray-200 rounded mb-2">
                    <div
                      className="h-3 bg-blue-500 rounded"
                      style={{
                        width: `${(parseFloat(result.c2_score) / 5) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <div className="mb-2 text-sm opacity-70">
                    {result.c2_evidence}
                  </div>
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
