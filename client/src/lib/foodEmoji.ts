/**
 * foodEmoji.ts
 * Keyword-to-emoji mapping for food item descriptions.
 * Entries are checked in order — put more specific phrases before broad ones.
 * Match is substring (case-insensitive), so "black coffee" hits "coffee".
 */

const EMOJI_MAP: [string, string[]][] = [
  // ── Eggs ──────────────────────────────────────────────────────────────────
  ['🥚', ['egg', 'omelette', 'omelet', 'frittata', 'quiche', 'deviled']],

  // ── Breakfast staples ──────────────────────────────────────────────────────
  ['🧇', ['waffle']],
  ['🥞', ['pancake', 'crepe', 'crêpe']],
  ['🥯', ['bagel']],
  ['🥐', ['croissant']],
  ['🍞', ['toast', 'bread', 'sourdough', 'baguette', 'brioche', 'roll', 'loaf', 'bun', 'focaccia', 'rye']],
  ['🫓', ['flatbread', 'pita', 'naan', 'tortilla', 'wrap']],
  ['🥨', ['pretzel']],

  // ── Cereals / grains ───────────────────────────────────────────────────────
  ['🌾', ['oat', 'oatmeal', 'granola', 'muesli', 'cereal', 'quinoa', 'barley', 'wheat germ', 'bran']],

  // ── Rice / noodles / pasta ─────────────────────────────────────────────────
  ['🍚', ['rice', 'risotto', 'congee', 'pilaf', 'biryani', 'paella']],
  ['🍝', ['pasta', 'spaghetti', 'fettuccine', 'linguine', 'penne', 'rigatoni', 'lasagna', 'lasagne', 'gnocchi', 'tagliatelle', 'carbonara', 'bolognese', 'marinara']],
  ['🍜', ['ramen', 'udon', 'soba', 'lo mein', 'pad thai', 'pho', 'noodle', 'vermicelli']],

  // ── Soup / stew ────────────────────────────────────────────────────────────
  ['🍲', ['stew', 'casserole', 'chowder', 'bisque', 'broth', 'consommé']],
  ['🥣', ['soup', 'porridge', 'congee', 'bowl']],

  // ── Salad ─────────────────────────────────────────────────────────────────
  ['🥗', ['salad', 'coleslaw', 'slaw']],

  // ── Burger / sandwich ──────────────────────────────────────────────────────
  ['🍔', ['burger', 'hamburger', 'cheeseburger', 'veggie burger', 'patty melt']],
  ['🌭', ['hot dog', 'hotdog', 'sausage', 'bratwurst', 'brat', 'frankfurter', 'wiener', 'chorizo', 'kielbasa']],
  ['🥪', ['sandwich', 'sub', 'hoagie', 'hero', 'panini', 'blt', 'grilled cheese', 'club']],

  // ── Pizza ─────────────────────────────────────────────────────────────────
  ['🍕', ['pizza', 'calzone']],

  // ── Tacos / Mexican ───────────────────────────────────────────────────────
  ['🌮', ['taco']],
  ['🌯', ['burrito', 'quesadilla', 'enchilada', 'fajita']],
  ['🫔', ['tamale']],
  ['🫕', ['chili', 'chilli', 'curry', 'dal', 'dhal']],

  // ── Fries / chips ─────────────────────────────────────────────────────────
  ['🍟', ['fries', 'chips', 'tater tot', 'hash brown', 'hashbrown']],

  // ── Potato ────────────────────────────────────────────────────────────────
  ['🍠', ['sweet potato', 'yam']],
  ['🥔', ['potato', 'mashed', 'baked potato', 'roast potato']],

  // ── Poultry ───────────────────────────────────────────────────────────────
  ['🍗', ['chicken', 'turkey', 'duck', 'poultry', 'wing', 'drumstick', 'rotisserie', 'hen']],
  ['🥚', ['hard boil', 'soft boil']],

  // ── Meat ──────────────────────────────────────────────────────────────────
  ['🥩', ['steak', 'beef', 'sirloin', 'ribeye', 'filet', 'tenderloin', 'brisket', 'meatball', 'meatloaf', 'ground beef', 'minced beef', 'venison', 'veal', 'lamb', 'mutton']],
  ['🍖', ['pork', 'pork chop', 'spare rib', 'rack of rib', 'osso buco', 'pulled pork']],
  ['🥓', ['bacon', 'pancetta', 'prosciutto', 'ham', 'lardons', 'salami', 'pepperoni', 'mortadella', 'cured meat', 'deli meat']],

  // ── Seafood ───────────────────────────────────────────────────────────────
  ['🍣', ['sushi', 'sashimi', 'maki', 'nigiri', 'temaki', 'hand roll', 'roll']],
  ['🍤', ['shrimp tempura', 'fried shrimp', 'prawn cracker']],
  ['🦐', ['shrimp', 'prawn']],
  ['🦞', ['lobster']],
  ['🦀', ['crab', 'crab cake']],
  ['🦑', ['squid', 'calamari']],
  ['🐙', ['octopus']],
  ['🐟', ['fish', 'salmon', 'tuna', 'cod', 'haddock', 'halibut', 'tilapia', 'trout', 'sea bass', 'snapper', 'mackerel', 'sardine', 'anchovy', 'herring', 'mahi', 'catfish', 'fillet of fish']],
  ['🦪', ['oyster', 'clam', 'mussel', 'scallop']],

  // ── Vegetables ────────────────────────────────────────────────────────────
  ['🥦', ['broccoli', 'broccolini']],
  ['🥕', ['carrot']],
  ['🌽', ['corn', 'sweetcorn', 'polenta', 'grits']],
  ['🧅', ['onion', 'shallot', 'leek', 'spring onion', 'scallion']],
  ['🧄', ['garlic', 'aioli']],
  ['🥬', ['spinach', 'kale', 'lettuce', 'arugula', 'chard', 'bok choy', 'cabbage', 'collard', 'watercress']],
  ['🥒', ['cucumber', 'pickle', 'gherkin']],
  ['🍆', ['eggplant', 'aubergine']],
  ['🌶', ['jalapeño', 'jalapeno', 'chili pepper', 'chilli pepper', 'habanero', 'serrano', 'poblano']],
  ['🫑', ['bell pepper', 'capsicum', 'red pepper', 'green pepper', 'yellow pepper']],
  ['🍅', ['tomato', 'cherry tomato', 'sundried', 'marinara', 'salsa']],
  ['🍄', ['mushroom', 'truffle', 'shiitake', 'portobello']],
  ['🫘', ['bean', 'lentil', 'chickpea', 'edamame', 'hummus', 'falafel', 'black bean', 'kidney bean', 'white bean', 'tofu', 'tempeh']],
  ['🫒', ['olive']],
  ['🥑', ['avocado', 'guacamole']],
  ['🌿', ['herb', 'basil', 'mint', 'cilantro', 'coriander', 'parsley', 'thyme', 'rosemary', 'oregano', 'sage', 'dill', 'chive']],

  // ── Fruit ─────────────────────────────────────────────────────────────────
  ['🍎', ['apple']],
  ['🍊', ['orange', 'tangerine', 'mandarin', 'clementine', 'satsuma']],
  ['🍋', ['lemon', 'lime']],
  ['🍇', ['grape']],
  ['🍓', ['strawberry']],
  ['🫐', ['blueberry', 'blackberry', 'raspberry', 'açaí', 'acai']],
  ['🍑', ['peach', 'nectarine', 'apricot']],
  ['🍒', ['cherry']],
  ['🍍', ['pineapple']],
  ['🥭', ['mango']],
  ['🍌', ['banana', 'plantain']],
  ['🍉', ['watermelon']],
  ['🍈', ['melon', 'honeydew', 'cantaloupe']],
  ['🍐', ['pear']],
  ['🥝', ['kiwi']],
  ['🫙', ['fig', 'date', 'raisin', 'cranberry', 'currant', 'pomegranate', 'passion fruit', 'lychee', 'guava', 'papaya']],

  // ── Nuts / seeds ──────────────────────────────────────────────────────────
  ['🥜', ['peanut', 'almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'nut', 'seed', 'tahini', 'peanut butter', 'almond butter']],
  ['🌰', ['chestnut', 'hazelnut', 'macadamia']],

  // ── Dairy ─────────────────────────────────────────────────────────────────
  ['🧀', ['cheese', 'cheddar', 'mozzarella', 'parmesan', 'brie', 'gouda', 'swiss', 'feta', 'ricotta', 'cream cheese', 'goat cheese', 'blue cheese', 'gruyère', 'gruyere', 'camembert']],
  ['🥛', ['milk', 'oat milk', 'almond milk', 'soy milk', 'coconut milk', 'lactose']],
  ['🧈', ['butter', 'ghee', 'margarine']],
  ['🫙', ['yogurt', 'yoghurt', 'greek yogurt', 'kefir', 'sour cream', 'crème fraîche', 'creme fraiche']],

  // ── Ice cream / frozen ────────────────────────────────────────────────────
  ['🍦', ['ice cream', 'gelato', 'sorbet', 'frozen yogurt', 'popsicle', 'soft serve']],

  // ── Sweets / dessert ──────────────────────────────────────────────────────
  ['🍫', ['chocolate', 'brownie', 'cocoa', 'cacao', 'ganache', 'truffle']],
  ['🍰', ['cheesecake', 'cake slice', 'slice of cake']],
  ['🎂', ['cake', 'birthday cake', 'layer cake']],
  ['🧁', ['cupcake', 'muffin']],
  ['🍩', ['donut', 'doughnut', 'churro']],
  ['🥧', ['pie', 'tart', 'pastry', 'strudel', 'danish']],
  ['🍪', ['cookie', 'biscuit', 'shortbread', 'macaron', 'macaroon']],
  ['🍮', ['pudding', 'custard', 'flan', 'crème brûlée', 'creme brulee', 'panna cotta']],
  ['🍡', ['mochi', 'rice cake']],
  ['🍭', ['candy', 'lollipop', 'sweet', 'gummy', 'jelly bean']],
  ['🍬', ['caramel', 'toffee', 'fudge', 'nougat']],
  ['🍯', ['honey', 'maple syrup', 'agave', 'syrup']],
  ['🍿', ['popcorn']],
  ['🧂', ['chip', 'crisp', 'cracker', 'pretzel stick']],

  // ── Hot drinks ────────────────────────────────────────────────────────────
  ['☕', ['coffee', 'espresso', 'latte', 'cappuccino', 'americano', 'macchiato', 'flat white', 'cold brew', 'cold press', 'café', 'cafe']],
  ['🍵', ['tea', 'matcha', 'chai', 'herbal', 'chamomile', 'green tea', 'black tea', 'oolong', 'kombucha']],
  ['🍫', ['hot chocolate', 'hot cocoa']],

  // ── Cold drinks ───────────────────────────────────────────────────────────
  ['🧋', ['boba', 'bubble tea', 'milk tea']],
  ['🥤', ['smoothie', 'milkshake', 'shake', 'soda', 'cola', 'lemonade', 'iced coffee', 'iced tea', 'juice', 'energy drink', 'sports drink']],
  ['💧', ['water', 'sparkling water', 'mineral water', 'seltzer', 'tonic']],

  // ── Alcohol ───────────────────────────────────────────────────────────────
  ['🍺', ['beer', 'lager', 'ale', 'stout', 'ipa', 'pilsner', 'porter', 'saison', 'wheat beer', 'cider']],
  ['🍷', ['wine', 'red wine', 'white wine', 'rosé', 'rose wine', 'merlot', 'cabernet', 'pinot', 'chardonnay', 'sauvignon', 'riesling', 'prosecco', 'champagne', 'sparkling wine', 'mimosa']],
  ['🍸', ['cocktail', 'martini', 'margarita', 'cosmopolitan', 'negroni', 'manhattan', 'old fashioned', 'mojito', 'spritz']],
  ['🥃', ['whiskey', 'whisky', 'bourbon', 'scotch', 'rum', 'vodka', 'gin', 'tequila', 'brandy', 'cognac', 'shot']],
  ['🍹', ['piña colada', 'pina colada', 'daiquiri', 'sangria', 'punch']],
]

/**
 * Returns an emoji for the given food description, or an empty string if none matches.
 * Checks keywords in order — first match wins.
 */
export function getFoodEmoji(description: string): string {
  const lower = description.toLowerCase()
  for (const [emoji, keywords] of EMOJI_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return emoji
    }
  }
  return ''
}
