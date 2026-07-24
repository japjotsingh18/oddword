export type WordCategory =
  | "Animals" | "Food" | "Drinks" | "Sports" | "Technology"
  | "Vehicles" | "Household" | "Nature" | "Places" | "Occupations"
  | "Clothing" | "School" | "Entertainment" | "Travel" | "Weather";

export type WordPair = {
  id: string;
  category: WordCategory;
  main: string;
  odd: string;
};

const raw: Record<WordCategory, string[]> = {
  Animals: [
    "Cat|Dog","Lion|Tiger","Rabbit|Hamster","Horse|Donkey","Duck|Goose",
    "Bee|Wasp","Frog|Toad","Turtle|Tortoise","Crow|Raven","Shark|Dolphin",
    "Sheep|Goat","Mouse|Rat","Eagle|Hawk","Butterfly|Moth","Lizard|Gecko",
    "Wolf|Fox","Crab|Lobster","Parrot|Toucan","Penguin|Puffin","Cheetah|Leopard",
  ],
  Food: [
    "Burger|Pizza","Apple|Orange","Cake|Cookie","Pasta|Noodles","Rice|Couscous",
    "Taco|Burrito","Pancake|Waffle","Soup|Stew","Carrot|Celery","Peach|Plum",
    "Bread|Bagel","Popcorn|Chips","Brownie|Donut","Sushi|Dumpling","Cheese|Butter",
    "Ketchup|Mustard","Muffin|Cupcake","Cereal|Oatmeal","Sandwich|Wrap","Mango|Pineapple",
  ],
  Drinks: [
    "Coffee|Tea","Cola|Lemonade","Milk|Juice","Smoothie|Milkshake","Water|Soda",
    "Latte|Cappuccino","Cider|Punch","Espresso|Americano","Iced tea|Lemonade","Cocoa|Mocha",
    "Orange juice|Apple juice","Seltzer|Tonic","Energy drink|Sports drink","Green tea|Herbal tea","Root beer|Ginger ale",
    "Milk tea|Bubble tea","Limeade|Lemonade","Frappe|Milkshake","Chamomile|Peppermint","Slushie|Smoothie",
  ],
  Sports: [
    "Soccer|Basketball","Tennis|Badminton","Baseball|Cricket","Golf|Bowling","Skiing|Snowboarding",
    "Boxing|Wrestling","Surfing|Skating","Volleyball|Handball","Running|Cycling","Darts|Archery",
    "Rugby|Football","Swimming|Diving","Hockey|Lacrosse","Karate|Judo","Rowing|Canoeing",
    "Climbing|Hiking","Pool|Snooker","Gymnastics|Dance","Softball|Baseball","Squash|Racquetball",
  ],
  Technology: [
    "Phone|Tablet","Laptop|Desktop","Mouse|Trackpad","Keyboard|Controller","Camera|Webcam",
    "Speaker|Headphones","Charger|Battery","Printer|Scanner","Watch|Fitness band","Router|Modem",
    "Email|Text","App|Website","Password|PIN","Cable|Adapter","Microphone|Speaker",
    "Monitor|Television","Flash drive|Hard drive","Robot|Drone","Podcast|Audiobook","Search|Browse",
  ],
  Vehicles: [
    "Train|Bus","Car|Truck","Bike|Scooter","Boat|Ferry","Helicopter|Airplane",
    "Taxi|Limousine","Van|Minibus","Canoe|Kayak","Tractor|Bulldozer","Motorcycle|Moped",
    "Subway|Tram","Ambulance|Fire truck","Skateboard|Rollerblades","Sailboat|Yacht","Jeep|SUV",
    "Rocket|Shuttle","Tow truck|Pickup","Golf cart|Buggy","Raft|Rowboat","Cruise ship|Ferry",
  ],
  Household: [
    "Chair|Sofa","Fork|Spoon","Plate|Bowl","Lamp|Candle","Door|Window",
    "Broom|Mop","Oven|Microwave","Fridge|Freezer","Pillow|Blanket","Shower|Bathtub",
    "Cup|Mug","Clock|Calendar","Mirror|Picture","Bucket|Basket","Soap|Shampoo",
    "Towel|Washcloth","Blender|Mixer","Curtain|Blind","Shelf|Cabinet","Vacuum|Broom",
  ],
  Nature: [
    "Mountain|Hill","Ocean|Lake","River|Stream","Forest|Jungle","Rock|Pebble",
    "Flower|Tree","Island|Peninsula","Cave|Tunnel","Waterfall|Fountain","Desert|Beach",
    "Valley|Canyon","Pond|Lagoon","Leaf|Petal","Moss|Grass","Volcano|Geyser",
    "Cliff|Dune","Meadow|Field","Glacier|Iceberg","Shell|Coral","Branch|Root",
  ],
  Places: [
    "Beach|Pool","Library|Bookstore","Cafe|Restaurant","Park|Garden","Mall|Market",
    "Museum|Gallery","Hospital|Clinic","Hotel|Motel","Cinema|Theater","Gym|Stadium",
    "Zoo|Aquarium","Bakery|Deli","Office|Studio","Farm|Ranch","Castle|Palace",
    "Harbor|Marina","School|College","Airport|Station","Playground|Arcade","Salon|Spa",
  ],
  Occupations: [
    "Doctor|Nurse","Teacher|Professor","Chef|Baker","Pilot|Captain","Artist|Designer",
    "Police officer|Firefighter","Actor|Singer","Writer|Editor","Farmer|Gardener","Driver|Courier",
    "Dentist|Doctor","Mechanic|Engineer","Photographer|Filmmaker","Waiter|Bartender","Judge|Lawyer",
    "Barber|Stylist","Cashier|Teller","Plumber|Electrician","Coach|Trainer","Scientist|Inventor",
  ],
  Clothing: [
    "Shirt|Sweater","Jeans|Shorts","Sneakers|Boots","Hat|Cap","Jacket|Coat",
    "Dress|Skirt","Socks|Gloves","Scarf|Tie","Belt|Suspenders","Pajamas|Robe",
    "Sandals|Slippers","Suit|Tuxedo","Blouse|Cardigan","Hoodie|Sweatshirt","Vest|Jacket",
    "Watch|Bracelet","Ring|Necklace","Backpack|Handbag","Uniform|Costume","Swimsuit|Wetsuit",
  ],
  School: [
    "Pencil|Pen","Notebook|Textbook","Desk|Table","Teacher|Tutor","Quiz|Test",
    "Math|Science","Recess|Lunch","Crayon|Marker","Ruler|Protractor","Glue|Tape",
    "Backpack|Lunchbox","Library|Classroom","Homework|Project","Chalk|Marker","Eraser|Sharpener",
    "Map|Globe","Bell|Alarm","Lesson|Lecture","Grade|Score","Principal|Coach",
  ],
  Entertainment: [
    "Movie|Series","Song|Podcast","Concert|Festival","Comedy|Drama","Puzzle|Game",
    "Book|Magazine","Cartoon|Anime","Guitar|Piano","Dance|Karaoke","Magic|Circus",
    "Chess|Checkers","Photo|Video","Radio|Television","Hero|Villain","Stage|Screen",
    "Novel|Comic","Drums|Bongos","Ticket|Pass","Pop|Rock","Trailer|Preview",
  ],
  Travel: [
    "Passport|Ticket","Suitcase|Backpack","Hotel|Hostel","Map|Guidebook","Tourist|Traveler",
    "Flight|Cruise","Camping|Glamping","Trip|Vacation","Departure|Arrival","Window seat|Aisle seat",
    "Taxi|Shuttle","Resort|Lodge","Tent|Cabin","Hike|Tour","Souvenir|Postcard",
    "Visa|Passport","Beach|City","Road trip|Train ride","Reservation|Booking","Landmark|Monument",
  ],
  Weather: [
    "Sun|Moon","Rain|Snow","Storm|Blizzard","Cloud|Fog","Wind|Breeze",
    "Thunder|Lightning","Hot|Humid","Cold|Freezing","Drizzle|Shower","Hurricane|Tornado",
    "Rainbow|Sunset","Frost|Ice","Forecast|Report","Spring|Autumn","Shade|Shadow",
    "Heatwave|Drought","Sleet|Hail","Mist|Fog","Gust|Breeze","Sunny|Clear",
  ],
};

export const wordPairs: WordPair[] = Object.entries(raw).flatMap(
  ([category, pairs]) =>
    pairs.map((pair, index) => {
      const [main, odd] = pair.split("|");
      return {
        id: `${category.toLowerCase().replaceAll(" ", "-")}-${index + 1}`,
        category: category as WordCategory,
        main,
        odd,
      };
    }),
);

export function randomPair(excludingIds: string[] = []) {
  const available = wordPairs.filter((pair) => !excludingIds.includes(pair.id));
  return available[Math.floor(Math.random() * available.length)] ?? wordPairs[0];
}
