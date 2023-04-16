import { useState } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  useParams,
} from "react-router-dom";
import { PaperAirplaneIcon, StarIcon } from "@heroicons/react/24/solid";
import exampleOutput from "./example-output-3.json";
import classNames from "classnames";

function stringifyDate(date: Date) {
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
    placeholder: "Japanese food, fresh sushi, outdoor seating",
    bgColor: "bg-orange-50",
    tagColor: "bg-orange-200",
    tagColorHover: "hover:bg-orange-300",
    primaryColor: "text-orange-300",
    primaryColorHover: "hover:text-orange-400",
  },
  dentist: {
    name: "Dentist",
    placeholder: "honesty, knowledge, empathy",
    bgColor: "bg-blue-50",
    tagColor: "bg-blue-200",
    tagColorHover: "hover:bg-blue-300",
    primaryColor: "text-blue-300",
    primaryColorHover: "hover:text-blue-400",
  },
  bar: {
    name: "Bar",
    placeholder: "outdoor seating, high energy, open late",
    bgColor: "bg-yellow-50",
    tagColor: "bg-yellow-200",
    tagColorHover: "hover:bg-yellow-300",
    primaryColor: "text-yellow-300",
    primaryColorHover: "hover:text-yellow-400",
  },
  salon: {
    name: "Beauty Salon",
    placeholder: "hair dye, can give good fade",
    bgColor: "bg-red-50",
    tagColor: "bg-red-200",
    tagColorHover: "hover:bg-red-300",
    primaryColor: "text-red-300",
    primaryColorHover: "hover:text-red-400",
  },
  doctor: {
    name: "Doctor",
    placeholder: "intelligence, good bedside manner, good listener",
    bgColor: "bg-green-50",
    tagColor: "bg-green-200",
    tagColorHover: "hover:bg-green-300",
    primaryColor: "text-green-300",
    primaryColorHover: "hover:text-green-400",
  },
};

const host = window.location.href.includes("localhost")
  ? "http://localhost:5003"
  : "https://gpt-recommend.herokuapp.com";

function Page() {
  const { category } = useParams<{ category: string }>();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [prompt, setPrompt] = useState("");

  async function getRecommendations() {
    console.log("wtf");
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${host}/recommendations/${category} with ${prompt}!!`
      );
      setLoading(false);
      const data = await response.json();
      console.log(data);
      setResults(data);
    } catch (e) {
      setLoading(false);
      setError(e + "");
    }
  }

  const categoryProperties =
    CATEGORY_MAP[category as keyof typeof CATEGORY_MAP];

  return (
    <div
      className={classNames(
        "min-h-screen flex flex-col p-4",
        categoryProperties.bgColor
      )}
    >
      <div className="max-w-4xl mx-auto mt-16 w-full">
        <div
          className="text-lg mb-2 flex items-center"
          style={{ marginTop: -2 }} // the category tag pushes things 2px down; this undos that
        >
          Find a
          <a
            className={classNames(
              "rounded px-3 py-0.5 mx-2",
              categoryProperties.tagColor,
              categoryProperties.tagColorHover
            )}
            href="/"
          >
            {categoryProperties.name}
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
            placeholder={categoryProperties.placeholder}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                getRecommendations();
              }
            }}
          />
          <PaperAirplaneIcon
            className={classNames(
              "w-5 h-5 cursor-pointer",
              categoryProperties.primaryColor,
              categoryProperties.primaryColorHover
            )}
            onClick={() => {
              getRecommendations();
            }}
          />
        </div>
        {error && (
          <div className="text-red-500 mb-8">
            <div className="font-semibold">Error</div>
            <div>{error}</div>
          </div>
        )}
        {loading && (
          <div className="flex flex-col space-y-8 opacity-20">
            {Array.from({ length: 3 }).map(() => (
              <div
                role="status"
                className="space-y-8 animate-pulse sm:space-y-0 sm:space-x-8 sm:flex"
              >
                <div className="flex items-center justify-center w-40 h-40 shrink-0 bg-gray-300 rounded dark:bg-gray-700">
                  <svg
                    className="w-12 h-12 text-gray-200"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                    fill="currentColor"
                    viewBox="0 0 640 512"
                  >
                    <path d="M480 80C480 35.82 515.8 0 560 0C604.2 0 640 35.82 640 80C640 124.2 604.2 160 560 160C515.8 160 480 124.2 480 80zM0 456.1C0 445.6 2.964 435.3 8.551 426.4L225.3 81.01C231.9 70.42 243.5 64 256 64C268.5 64 280.1 70.42 286.8 81.01L412.7 281.7L460.9 202.7C464.1 196.1 472.2 192 480 192C487.8 192 495 196.1 499.1 202.7L631.1 419.1C636.9 428.6 640 439.7 640 450.9C640 484.6 612.6 512 578.9 512H55.91C25.03 512 .0006 486.1 .0006 456.1L0 456.1z" />
                  </svg>
                </div>
                <div className="w-full">
                  <div className="h-3 bg-gray-200 rounded-full dark:bg-gray-700 w-48 mb-4"></div>
                  <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700 max-w-[80px] mb-2.5"></div>
                  <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700 max-w-[140px] mb-2.5"></div>
                  <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700 max-w-[120px] mb-4"></div>
                  <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700 mb-2.5"></div>
                  <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700 max-w-[440px] mb-2.5"></div>
                  <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700 max-w-[460px] mb-2.5"></div>
                  <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700 max-w-[360px] mb-4"></div>
                  <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700 mb-2.5"></div>
                  <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700 max-w-[440px] mb-2.5"></div>
                  <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700 max-w-[460px] mb-2.5"></div>
                  <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700 max-w-[360px] mb-4"></div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4">
          {results.map((result: any) => {
            const restaurantStatus = getRestaurantStatus(
              new Date(),
              result.operation_hours
            );

            const wholeStars = Math.floor(result.aggregated_rating);
            const fraction = result.aggregated_rating % 1;

            return (
              <div
                className="flex mb-8 sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0 flex-col"
                key={result.business_name}
              >
                <img
                  className="w-40 h-40 object-contain rounded shrink-0"
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
                            className={classNames(
                              "h-4 w-4",
                              categoryProperties.primaryColor
                            )}
                            key={i}
                          />
                        );
                      })}
                      {fraction > 0 && (
                        <StarIcon
                          className={classNames(
                            "h-4 w-4",
                            categoryProperties.primaryColor
                          )}
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
                    {result.c1_evidence.map((ev: string) => {
                      return (
                        <div className="mb-2 border-l-2 border-black/20 pl-4">
                          "{ev.trim()}"
                        </div>
                      );
                    })}
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
                    {result.c2_evidence.map((ev: string) => {
                      return (
                        <div className="mb-2 border-l-2 border-black/20 pl-4">
                          "{ev.trim()}"
                        </div>
                      );
                    })}
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
          <div className="flex text-lg flex-wrap">
            <a
              className="rounded bg-orange-200 px-3 py-0.5 hover:bg-orange-300 mr-2 mb-2"
              href="/restaurant"
            >
              Restaurant
            </a>
            <a
              className="rounded bg-blue-200 px-3 py-0.5 hover:bg-blue-300 mr-2 mb-2"
              href="/dentist"
            >
              Dentist
            </a>
            <a
              className="rounded bg-yellow-200 px-3 py-0.5 hover:bg-yellow-300 mr-2 mb-2"
              href="/bar"
            >
              Bar
            </a>
            <a
              className="rounded bg-red-200 px-3 py-0.5 hover:bg-red-300 mr-2 mb-2"
              href="/salon"
            >
              Beauty Salon
            </a>
            <a
              className="rounded bg-green-200 px-3 py-0.5 hover:bg-green-300 mr-2 mb-2"
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
