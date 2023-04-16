import { useState } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  useParams,
} from "react-router-dom";
import { PaperAirplaneIcon, StarIcon } from "@heroicons/react/24/solid";
import exampleOutput from "./example-output.json";

type TimeRange = {
  open: Date;
  close: Date;
};

type RestaurantStatus = {
  isOpen: boolean;
  nextEvent: Date;
};

function stringifyDate(date: Date) {
  const hours24 = date.getHours();
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minutes = date.getMinutes();
  const amPm = hours24 < 12 ? "AM" : "PM";

  const hoursStr = hours12.toString();
  const minutesStr = minutes.toString().padStart(2, "0");

  return `${hoursStr}:${minutesStr} ${amPm}`;
}

function parseTime(timeStr: string): Date {
  const now = new Date();
  const [hours, minutes] = timeStr.split(/[:\s]/).filter(Boolean);
  const amPm = timeStr.match(/AM|PM/i)?.[0] ?? "AM";
  console.log("parsed", timeStr);

  const hours24 =
    amPm.toUpperCase() === "PM" ? parseInt(hours) + 12 : parseInt(hours);
  const minutesInt = parseInt(minutes);

  const result = new Date(now);
  result.setHours(hours24, minutesInt, 0, 0);
  return result;
}

function parseTimeRanges(timeRangesStr: string[]): TimeRange[] {
  return timeRangesStr.map((rangeStr) => {
    const [openStr, , closeStr] = rangeStr.split(/[-\s]/).filter(Boolean);
    return {
      open: parseTime(openStr),
      close: parseTime(closeStr),
    };
  });
}

function restaurantStatus(
  timeRangesStr: string[],
  currentTime: Date
): RestaurantStatus {
  const timeRanges = parseTimeRanges(timeRangesStr);

  for (const range of timeRanges) {
    if (currentTime >= range.open && currentTime < range.close) {
      return {
        isOpen: true,
        nextEvent: range.close,
      };
    }
  }

  const nextOpen = timeRanges
    .map((range) => range.open)
    .sort((a, b) => a.getTime() - b.getTime())
    .find((openTime) => openTime > currentTime);

  return {
    isOpen: false,
    nextEvent: nextOpen || timeRanges[0].open,
  };
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
      `http://localhost:5003/recommendations/${category} that ${prompt}`
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
            const dayOfWeekIndex = (new Date().getDay() + 6) % 7;
            const hoursToday =
              result.operation_hours[dayOfWeekIndex].regularHours;
            let status: RestaurantStatus;
            if (hoursToday == null) {
              status = {
                isOpen: false,
                nextEvent: new Date(),
              };
            } else {
              status = restaurantStatus(hoursToday, new Date());
            }

            return (
              <div className="flex space-x-4 mb-4">
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
                      {Array.from({ length: 5 }).map(() => {
                        return <StarIcon className="h-4 w-4 text-orange-300" />;
                      })}
                    </div>
                    <div className="text-sm text-gray-500">
                      {result.review_count}
                    </div>
                  </div>
                  <div className="flex space-x-2 mb-2">
                    {result.categories.map((category: string) => {
                      return (
                        <span className="bg-black/5 px-2 rounded text-sm">
                          {category}
                        </span>
                      );
                    })}
                  </div>
                  <div className="mb-4 text-sm text-gray-500">
                    {status.isOpen
                      ? `Open until ${stringifyDate(status.nextEvent)}`
                      : `Closed until ${stringifyDate(status.nextEvent)}`}
                  </div>
                  <div className="mb-1">{result.c1_name}</div>
                  <div className="h-3 w-64 bg-black/5 rounded mb-2">
                    <div
                      className="h-3 bg-green-500 rounded"
                      style={{
                        width: `${(parseFloat(result.c1_score) / 5) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <div className="mb-4 text-sm text-gray-700">
                    {result.c1_evidence}
                  </div>
                  <div className="mb-1">{result.c2_name}</div>
                  <div className="h-3 w-64 bg-gray-200 rounded mb-2">
                    <div
                      className="h-3 bg-blue-500 rounded"
                      style={{
                        width: `${(parseFloat(result.c2_score) / 5) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <div className="mb-2 text-sm text-gray-700">
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
