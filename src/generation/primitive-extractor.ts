/**
 * Primitive Extractor — extracts domain-agnostic business primitives from a prompt.
 * No industry catalogs, no hardcoded categories. Pure text reasoning.
 */

export interface BusinessPrimitives {
  valueObject: string;
  transactionType: 'product-purchase' | 'service-booking' | 'subscription' | 'information' | 'lead-capture' | 'marketplace' | 'community';
  contentShape: string[];
  aestheticSignals: string[];
  emotionalIntent: string[];
  currency?: string;
  locale?: string;
}

interface PrimitiveSignal {
  pattern: RegExp;
  weight: number;
  mapsTo: Partial<BusinessPrimitives>;
}

const VALUE_OBJECT_PATTERNS: PrimitiveSignal[] = [
  // ─── Electronics & Tech (specific first) ─────────────────────────
  { pattern: /\b(premium\s+)?(headphone|earphone|earbud|headset|audio|speaker|sound|music)\b/gi, weight: 3, mapsTo: { valueObject: 'headphone' } },
  { pattern: /\b(crypto|defi|lending|borrowing|yield|staking|wallet|blockchain|nft)\b/gi, weight: 3, mapsTo: { valueObject: 'crypto' } },
  { pattern: /\b(ai|artificial.intelligence|machine.learning|neural|model|ml)\b/gi, weight: 3, mapsTo: { valueObject: 'ai-company' } },
  { pattern: /\b(gaming|game|esport|streamer|twitch|youtube.gaming)\b/gi, weight: 3, mapsTo: { valueObject: 'gaming' } },

  // ─── Home Services ───────────────────────────────────────────────
  { pattern: /\b(plumber?|plumbing|pipe|drain|water.heater|leak|sewer|fixture)\b/gi, weight: 3, mapsTo: { valueObject: 'plumber' } },
  { pattern: /\b(electrician|electric|wiring|panel|circuit|outlet|ev.charger|generator)\b/gi, weight: 3, mapsTo: { valueObject: 'electrician' } },
  { pattern: /\b(hvac|air.condition|furnace|heat.pump|duct|thermostat|ac.repair)\b/gi, weight: 3, mapsTo: { valueObject: 'hvac' } },
  { pattern: /\b(landscape|lawn|garden|tree|irrigation|hardscap|mulch|snow.removal)\b/gi, weight: 3, mapsTo: { valueObject: 'landscaping' } },
  { pattern: /\b(cleaning|clean|janitorial|maid|deep.clean|carpet.clean|window.clean|sanitize)\b/gi, weight: 3, mapsTo: { valueObject: 'cleaning' } },
  { pattern: /\b(roof|gutter|siding|chimney|window.repair|exterior)\b/gi, weight: 3, mapsTo: { valueObject: 'roofing' } },
  { pattern: /\b(floor|tile|hardwood|laminate|vinyl|carpet.install|remodel)\b/gi, weight: 3, mapsTo: { valueObject: 'flooring' } },
  { pattern: /\b(paint|painting|wallpaper|drywall|texture|interior.design)\b/gi, weight: 3, mapsTo: { valueObject: 'painting' } },
  { pattern: /\b(lock|locksmith|key|security|access.control|safe)\b/gi, weight: 3, mapsTo: { valueObject: 'locksmith' } },
  { pattern: /\b(junk.removal|hauling|dumpster|debris|cleanup|cleanout)\b/gi, weight: 3, mapsTo: { valueObject: 'junk-removal' } },
  { pattern: /\b(pest.control|exterminator|termite|rodent|ant|cockroach|bed.bug)\b/gi, weight: 3, mapsTo: { valueObject: 'pest-control' } },

  // ─── Health & Wellness ───────────────────────────────────────────
  { pattern: /\b(dentist|dental|teeth|ortho|crown|implant|whitening|root.canal)\b/gi, weight: 3, mapsTo: { valueObject: 'dentist' } },
  { pattern: /\b(chiropractor|chiropractic|spine|adjustment|back.pain|neck.pain)\b/gi, weight: 3, mapsTo: { valueObject: 'chiropractor' } },
  { pattern: /\b(physical.therapy|rehab|mobility|strength|sports.injury|post.surgery)\b/gi, weight: 3, mapsTo: { valueObject: 'physical-therapy' } },
  { pattern: /\b(therap|counsel|mental.health|anxiety|depression|trauma|cbt|emdr)\b/gi, weight: 3, mapsTo: { valueObject: 'mental-health' } },
  { pattern: /\b(yoga|pilates|meditation|wellness|retreat|studio)\b/gi, weight: 3, mapsTo: { valueObject: 'yoga' } },
  { pattern: /\b(nutrition|dietitian|meal.plan|weight.loss|wellness.coach)\b/gi, weight: 3, mapsTo: { valueObject: 'nutrition' } },
  { pattern: /\b(massage|spa|facial|body.work|relaxation|wellness)\b/gi, weight: 3, mapsTo: { valueObject: 'spa' } },
  { pattern: /\b(veterinar|vet|animal.hospital|pet.clinic|animal.care)\b/gi, weight: 3, mapsTo: { valueObject: 'veterinary' } },
  { pattern: /\b(eye.doctor|optometr|optical|eyeglass|contact.lens|vision)\b/gi, weight: 3, mapsTo: { valueObject: 'optometry' } },
  { pattern: /\b(hearing|audiolog|hearing.aid|hearing.test|ear.care)\b/gi, weight: 3, mapsTo: { valueObject: 'audiology' } },
  { pattern: /\b(urgent.care|walk.in|immediate.care|clinic|medical.clinic)\b/gi, weight: 3, mapsTo: { valueObject: 'urgent-care' } },

  // ─── Auto & Transport ───────────────────────────────────────────
  { pattern: /\b(auto.repair|mechanic|oil.change|brake|engine|transmission|tire)\b/gi, weight: 3, mapsTo: { valueObject: 'auto-repair' } },
  { pattern: /\b(car.dealer|dealership|new.car|used.car|financing|trade.in|test.drive)\b/gi, weight: 3, mapsTo: { valueObject: 'car-dealer' } },
  { pattern: /\b(car.wash|auto.detail|detailing|wax|polish|ceramic.coating)\b/gi, weight: 3, mapsTo: { valueObject: 'car-wash' } },
  { pattern: /\b(tow|towing|roadside|breakdown|flat.tire|jump.start)\b/gi, weight: 3, mapsTo: { valueObject: 'towing' } },
  { pattern: /\b(parking|garage|valet|lot|parking.space)\b/gi, weight: 3, mapsTo: { valueObject: 'parking' } },

  // ─── Food & Beverage ────────────────────────────────────────────
  { pattern: /\b(restaurant|cafe|dining|eatery|bistro|brasserie)\b/gi, weight: 3, mapsTo: { valueObject: 'restaurant' } },
  { pattern: /\b(bakery|cake|pastry|bread|cookie|pie|dessert)\b/gi, weight: 3, mapsTo: { valueObject: 'bakery' } },
  { pattern: /\b(coffee|espresso|latte|cafe|roast|brew|barista)\b/gi, weight: 3, mapsTo: { valueObject: 'coffee-shop' } },
  { pattern: /\b(food.truck|street.food|mobile.food|food.vendor)\b/gi, weight: 3, mapsTo: { valueObject: 'food-truck' } },
  { pattern: /\b(brewery|craft.beer|taproom|beer|lager|ipa|stout)\b/gi, weight: 3, mapsTo: { valueObject: 'brewery' } },
  { pattern: /\b(winery|vineyard|cellar|tasting.room|wine.bar|sommelier)\b/gi, weight: 3, mapsTo: { valueObject: 'winery' } },
  { pattern: /\b(butcher|meat|charcuterie|sausage|steak|cut|deli)\b/gi, weight: 3, mapsTo: { valueObject: 'butcher' } },
  { pattern: /\b(flower|bouquet|floral|arrangement|delivery|event.floral)\b/gi, weight: 3, mapsTo: { valueObject: 'flower' } },

  // ─── Professional Services ───────────────────────────────────────
  { pattern: /\b(accountant|accounting|cpa|tax|bookkeep|payroll|audit)\b/gi, weight: 3, mapsTo: { valueObject: 'accountant' } },
  { pattern: /\b(lawyer|attorney|law.firm|legal|litigation|counsel|paralegal)\b/gi, weight: 3, mapsTo: { valueObject: 'lawyer' } },
  { pattern: /\b(real.estate|realtor|listing|agent|mortgage|property|broker)\b/gi, weight: 3, mapsTo: { valueObject: 'real-estate-agent' } },
  { pattern: /\b(insurance|agent|policy|coverage|claim|underwriter|broker)\b/gi, weight: 3, mapsTo: { valueObject: 'insurance-agent' } },
  { pattern: /\b(financial.advisor|wealth|investment|retirement|financial.plan)\b/gi, weight: 3, mapsTo: { valueObject: 'financial-advisor' } },
  { pattern: /\b(architect|design|blueprint|building|structure|space.plan)\b/gi, weight: 3, mapsTo: { valueObject: 'architect' } },
  { pattern: /\b(consult|consulting|advisor|strategy|management.consult)\b/gi, weight: 3, mapsTo: { valueObject: 'consulting' } },
  { pattern: /\b(marketing|advertising|brand|pr|public.relations|media)\b/gi, weight: 3, mapsTo: { valueObject: 'marketing' } },
  { pattern: /\b(hr|human.resource|recruiting|talent|staffing|workforce)\b/gi, weight: 3, mapsTo: { valueObject: 'staffing' } },

  // ─── Education ──────────────────────────────────────────────────
  { pattern: /\b(course|lesson|tutorial|workshop|training|education|learn)\b/gi, weight: 3, mapsTo: { valueObject: 'course' } },
  { pattern: /\b(tutor|tutoring|test.prep|sat|act|homework|academic)\b/gi, weight: 3, mapsTo: { valueObject: 'tutoring' } },
  { pattern: /\b(music.school|music.lesson|piano|guitar|violin|voice|drum)\b/gi, weight: 3, mapsTo: { valueObject: 'music-school' } },
  { pattern: /\b(dance.studio|dance.lesson|ballet|salsa|hiphop|choreography)\b/gi, weight: 3, mapsTo: { valueObject: 'dance-studio' } },
  { pattern: /\b(driving.school|driving.lesson|driver.ed|behind.wheel|driving.class)\b/gi, weight: 3, mapsTo: { valueObject: 'driving-school' } },
  { pattern: /\b(k-12|school|academy|private.school|college|university)\b/gi, weight: 3, mapsTo: { valueObject: 'school' } },

  // ─── Events & Entertainment ─────────────────────────────────────
  { pattern: /\b(wedding.photographer|photographer|photography|portrait|engagement|boudoir|portfolio)\b/gi, weight: 3, mapsTo: { valueObject: 'wedding-photographer' } },
  { pattern: /\b(dj|disc.jockey|event.dj|wedding.dj|mobile.dj|sound.system)\b/gi, weight: 3, mapsTo: { valueObject: 'dj-event' } },
  { pattern: /\b(event.venue|venue|banquet|wedding.venue|party.space|event.space)\b/gi, weight: 3, mapsTo: { valueObject: 'event-venue' } },
  { pattern: /\b(wedding.planner|event.planner|coordinator|wedding.coordinator)\b/gi, weight: 3, mapsTo: { valueObject: 'wedding-planner' } },
  { pattern: /\b(party.rental|rental|tent|chair|table|linen|event.rental)\b/gi, weight: 3, mapsTo: { valueObject: 'party-rental' } },
  { pattern: /\b(cater|catering|food.service|event.catering|banquet.catering)\b/gi, weight: 3, mapsTo: { valueObject: 'catering' } },
  { pattern: /\b(photo.booth|selfie.station|event.photo|prop.box)\b/gi, weight: 3, mapsTo: { valueObject: 'photo-booth' } },

  // ─── Retail & E-Commerce ────────────────────────────────────────
  { pattern: /\b(boutique|fashion|clothing|apparel|accessories|style|wear)\b/gi, weight: 3, mapsTo: { valueObject: 'boutique' } },
  { pattern: /\b(jewelry|jewel|ring|necklace|bracelet|diamond|gold|silver)\b/gi, weight: 3, mapsTo: { valueObject: 'jewelry-store' } },
  { pattern: /\b(pet.store|pet.supply|dog.food|cat.toy|pet.shop|pet.shoppe)\b/gi, weight: 3, mapsTo: { valueObject: 'pet-store' } },
  { pattern: /\b(bookstore|book.shop|book|literature|reading|rare.book)\b/gi, weight: 3, mapsTo: { valueObject: 'bookstore' } },
  { pattern: /\b(gift.shop|gift|souvenir|novelty|gag.gift|artisan.gift)\b/gi, weight: 3, mapsTo: { valueObject: 'gift-shop' } },
  { pattern: /\b(thrift|vintage|consignment|second.hand|antique|resale)\b/gi, weight: 3, mapsTo: { valueObject: 'thrift-store' } },
  { pattern: /\b(nursery|garden.center|plant|succulent|flower.shop|greenhouse)\b/gi, weight: 3, mapsTo: { valueObject: 'nursery' } },
  { pattern: /\b(hardware.store|lumber|building.material|home.improvement)\b/gi, weight: 3, mapsTo: { valueObject: 'hardware-store' } },

  // ─── Fitness & Sports ───────────────────────────────────────────
  { pattern: /\b(gym|fitness|personal.training|weight.room|cardio|workout)\b/gi, weight: 3, mapsTo: { valueObject: 'gym' } },
  { pattern: /\b(crossfit|wod|box|functional.fitness|olympic.lift)\b/gi, weight: 3, mapsTo: { valueObject: 'crossfit' } },
  { pattern: /\b(sports.complex|field|court|facility|league|tournament)\b/gi, weight: 3, mapsTo: { valueObject: 'sports-complex' } },
  { pattern: /\b(martial.art|karate|taekwondo|jiu.jitsu|mma|boxing.gym|kickboxing)\b/gi, weight: 3, mapsTo: { valueObject: 'martial-arts' } },
  { pattern: /\b(tennis|tennis.court|racquet|pickleball|tennis.lesson)\b/gi, weight: 3, mapsTo: { valueObject: 'tennis' } },
  { pattern: /\b(golf|golf.course|golf.club|driving.range|putting|golf.lesson)\b/gi, weight: 3, mapsTo: { valueObject: 'golf' } },
  { pattern: /\b(swim|pool|swimming.lesson|aquatic|water.aerobics)\b/gi, weight: 3, mapsTo: { valueObject: 'swimming' } },

  // ─── Non-Profit & Community ─────────────────────────────────────
  { pattern: /\b(nonprofit|non.profit|charity|donation|volunteer|mission)\b/gi, weight: 3, mapsTo: { valueObject: 'nonprofit' } },
  { pattern: /\b(church|church|religious|faith|worship|congregation|ministry)\b/gi, weight: 3, mapsTo: { valueObject: 'church' } },
  { pattern: /\b(community.center|recreation|community.program|youth.program)\b/gi, weight: 3, mapsTo: { valueObject: 'community-center' } },

  // ─── Agriculture & Food Production ──────────────────────────────
  { pattern: /\b(farm|organic|produce|csa|farmers.market|harvest|agriculture)\b/gi, weight: 3, mapsTo: { valueObject: 'farm' } },
  { pattern: /\b(ranch|cattle|livestock|ranching|pasture|grazing)\b/gi, weight: 3, mapsTo: { valueObject: 'ranch' } },
  { pattern: /\b(fish|seafood|aquaculture|oyster|shrimp|lobster|catch)\b/gi, weight: 3, mapsTo: { valueObject: 'seafood' } },

  // ─── Manufacturing & Industrial ─────────────────────────────────
  { pattern: /\b(manufactur|fabricat|cnc|production|assembly|machining)\b/gi, weight: 3, mapsTo: { valueObject: 'manufacturing' } },
  { pattern: /\b(construction|builder|general.contractor|remodel|renovation)\b/gi, weight: 3, mapsTo: { valueObject: 'construction' } },
  { pattern: /\b(property.management|rental|tenant|lease|maintenance|vacancy)\b/gi, weight: 3, mapsTo: { valueObject: 'property-management' } },

  // ─── Transportation & Logistics ─────────────────────────────────
  { pattern: /\b(moving|moving.company|movers|relocation|pack|ship)\b/gi, weight: 3, mapsTo: { valueObject: 'moving' } },
  { pattern: /\b(freight|shipping|logistics|supply.chain|warehouse|delivery)\b/gi, weight: 3, mapsTo: { valueObject: 'freight' } },
  { pattern: /\b(chauffeur|limo|limousine|black.car|car.service|executive.transport)\b/gi, weight: 3, mapsTo: { valueObject: 'chauffeur' } },

  // ─── Business Services ──────────────────────────────────────────
  { pattern: /\b(agency|service|consulting|freelance|design|marketing)\b/gi, weight: 3, mapsTo: { valueObject: 'service' } },
  { pattern: /\b(print|print.copy|sign|banner|business.card|flyer|poster)\b/gi, weight: 3, mapsTo: { valueObject: 'print-shop' } },
  { pattern: /\b(shipping.store|ups|fedex|mailbox|package|notary)\b/gi, weight: 3, mapsTo: { valueObject: 'shipping-store' } },
  { pattern: /\b(storage|self.storage|unit|locker|container.storage)\b/gi, weight: 3, mapsTo: { valueObject: 'storage' } },
  { pattern: /\b(co.working|cowork|office.space|shared.office|meeting.room)\b/gi, weight: 3, mapsTo: { valueObject: 'co-working' } },
  { pattern: /\b(business.coach|coaching|mentor|executive.coach|leadership)\b/gi, weight: 3, mapsTo: { valueObject: 'business-coach' } },

  // ─── Generic (LAST - only matches if nothing specific matched) ───
  { pattern: /\b(app|software|platform|tool|saas|dashboard|api|developer)\b/gi, weight: 2, mapsTo: { valueObject: 'app' } },
  { pattern: /\b(store|shop|ecommerce|e-commerce|marketplace|shopify)\b/gi, weight: 2, mapsTo: { valueObject: 'store' } },
  { pattern: /\b(business|company|enterprise|startup|venture)\b/gi, weight: 1, mapsTo: { valueObject: 'business' } },
];

const TRANSACTION_TYPE_PATTERNS: PrimitiveSignal[] = [
  { pattern: /\b(buy|purchase|order|checkout|cart|price|cost)\b|[$€£₹¥]\s*\d+|\b(USD|EUR|GBP|INR|JPY|CAD|AUD)\b/gi, weight: 3, mapsTo: { transactionType: 'product-purchase' } },
  { pattern: /\b(book|reserve|appointment|schedule|session|slot)\b/gi, weight: 3, mapsTo: { transactionType: 'service-booking' } },
  { pattern: /\b(subscribe|subscription|monthly|recurring|membership|plan)\b/gi, weight: 3, mapsTo: { transactionType: 'subscription' } },
  { pattern: /\b(contact|lead|signup|register|enquire|quote|demo)\b/gi, weight: 2, mapsTo: { transactionType: 'lead-capture' } },
  { pattern: /\b(marketplace|vendor|seller|multi-vendor|commission)\b/gi, weight: 3, mapsTo: { transactionType: 'marketplace' } },
  { pattern: /\b(community|forum|member|discussion|social|network)\b/gi, weight: 3, mapsTo: { transactionType: 'community' } },
  { pattern: /\b(article|blog|guide|resource|learn|read|documentation)\b/gi, weight: 2, mapsTo: { transactionType: 'information' } },
];

const CONTENT_SHAPE_PATTERNS: PrimitiveSignal[] = [
  { pattern: /\b(three|four|five|multiple|several|various|models|tiers|variants)\b/gi, weight: 3, mapsTo: { contentShape: ['multiple-products'] } },
  { pattern: /\b(single|one|only)\b/gi, weight: 2, mapsTo: { contentShape: ['single-product'] } },
  { pattern: /\b(spec|specification|feature|compare|comparison|table)\b/gi, weight: 3, mapsTo: { contentShape: ['specs-table'] } },
  { pattern: /\b(gallery|image|photo|visual|showcase|lookbook|portfolio)\b/gi, weight: 3, mapsTo: { contentShape: ['image-gallery'] } },
  { pattern: /\b(review|rating|testimonial|feedback|endorsement)\b/gi, weight: 2, mapsTo: { contentShape: ['reviews'] } },
  { pattern: /\b(schedule|calendar|timetable|availability|booking)\b/gi, weight: 3, mapsTo: { contentShape: ['schedule-times'] } },
  { pattern: /\b(team|trainer|instructor|profile|bio|staff|crew)\b/gi, weight: 2, mapsTo: { contentShape: ['team-profiles'] } },
  { pattern: /\b(location|map|address|nearby|delivery.area|directions)\b/gi, weight: 2, mapsTo: { contentShape: ['location-map'] } },
  { pattern: /\b(pricing|plan|tier|package|rate|cost|fee)\b/gi, weight: 2, mapsTo: { contentShape: ['pricing-table'] } },
  { pattern: /\b(dashboard|analytics|metric|report|insight|data)\b/gi, weight: 2, mapsTo: { contentShape: ['dashboard'] } },
  { pattern: /\b(form|field|input|survey|questionnaire|application)\b/gi, weight: 1, mapsTo: { contentShape: ['form'] } },
  { pattern: /\b(menu|food.menu|drink.menu|wine.list|specials|dish|plate)\b/gi, weight: 3, mapsTo: { contentShape: ['menu-display'] } },
  { pattern: /\b(service.list|services.offer|what.we.do|service.menu)\b/gi, weight: 3, mapsTo: { contentShape: ['service-list'] } },
  { pattern: /\b(property|listing|house|apartment|condo|real.estate.listing)\b/gi, weight: 3, mapsTo: { contentShape: ['property-listings'] } },
  { pattern: /\b(before.after|transformation|result|progress|case.study)\b/gi, weight: 3, mapsTo: { contentShape: ['before-after'] } },
  { pattern: /\b(faq|question|answer|frequently.asked|common.question)\b/gi, weight: 2, mapsTo: { contentShape: ['faq-section'] } },
  { pattern: /\b(process|how.it.work|step|workflow|methodology|approach)\b/gi, weight: 2, mapsTo: { contentShape: ['process-steps'] } },
  { pattern: /\b(blog|article|post|news|update|story|content)\b/gi, weight: 2, mapsTo: { contentShape: ['blog-feed'] } },
  { pattern: /\b(client|customer|partner|brand|logo)\b/gi, weight: 2, mapsTo: { contentShape: ['client-logos'] } },
  { pattern: /\b(stat|number|count|metric|achievement|milestone|impact)\b/gi, weight: 2, mapsTo: { contentShape: ['stats-numbers'] } },
  { pattern: /\b(video|youtube|vimeo|tutorial.video|demo.video|promo)\b/gi, weight: 2, mapsTo: { contentShape: ['video-embed'] } },
  { pattern: /\b(membership|member|club|vip|tier|level|perk)\b/gi, weight: 2, mapsTo: { contentShape: ['membership-tiers'] } },
];

const AESTHETIC_SIGNAL_PATTERNS: PrimitiveSignal[] = [
  { pattern: /\b(dark|night|midnight|black|charcoal|obsidian)\b/gi, weight: 3, mapsTo: { aestheticSignals: ['dark-theme'] } },
  { pattern: /\b(light|white|minimal|clean|airy|bright)\b/gi, weight: 3, mapsTo: { aestheticSignals: ['light-theme'] } },
  { pattern: /\b(electric|neon|cyan|blue|glow|vibrant|saturated)\b/gi, weight: 3, mapsTo: { aestheticSignals: ['electric-blue'] } },
  { pattern: /\b(warm|gold|amber|sunset|terracotta|earth)\b/gi, weight: 3, mapsTo: { aestheticSignals: ['warm-gold'] } },
  { pattern: /\b(mono|monochrome|greyscale|grayscale)\b/gi, weight: 3, mapsTo: { aestheticSignals: ['monochrome'] } },
  { pattern: /\b(brutal|raw|industrial|concrete|raw)\b/gi, weight: 3, mapsTo: { aestheticSignals: ['brutalist'] } },
  { pattern: /\b(glass|glassmorphism|frost|blur|translucent)\b/gi, weight: 2, mapsTo: { aestheticSignals: ['glassmorphism'] } },
  { pattern: /\b(gradient|mesh|iridescent|holographic)\b/gi, weight: 2, mapsTo: { aestheticSignals: ['gradient-mesh'] } },
  { pattern: /\b(serif|editorial|magazine|typographic)\b/gi, weight: 2, mapsTo: { aestheticSignals: ['editorial-typography'] } },
  { pattern: /\b(motion|animate|scroll|parallax|transition)\b/gi, weight: 2, mapsTo: { aestheticSignals: ['scroll-motion'] } },
  { pattern: /\b(futuristic|cyber|tech|next-gen|cutting-edge|immersive)\b/gi, weight: 2, mapsTo: { aestheticSignals: ['animated-visual'] } },
];

const EMOTIONAL_INTENT_PATTERNS: PrimitiveSignal[] = [
  { pattern: /\b(silence|quiet|peaceful|tranquil|zen|still)\b/gi, weight: 3, mapsTo: { emotionalIntent: ['silence'] } },
  { pattern: /\b(calm|serene|relaxed|composed)\b/gi, weight: 3, mapsTo: { emotionalIntent: ['calm'] } },
  { pattern: /\b(futuristic|cyber|tech|innovation|next-gen|cutting-edge)\b/gi, weight: 3, mapsTo: { emotionalIntent: ['futuristic'] } },
  { pattern: /\b(premium|luxury|exclusive|elite|high-end|sophisticated)\b/gi, weight: 3, mapsTo: { emotionalIntent: ['premium'] } },
  { pattern: /\b(transform|transformation|change|evolve|upgrade|level-up)\b/gi, weight: 3, mapsTo: { emotionalIntent: ['transformation'] } },
  { pattern: /\b(trust|reliable|secure|safe|guaranteed|proven)\b/gi, weight: 2, mapsTo: { emotionalIntent: ['trust'] } },
  { pattern: /\b(energy|dynamic|powerful|intense|bold)\b/gi, weight: 2, mapsTo: { emotionalIntent: ['energy'] } },
  { pattern: /\b(natural|organic|pure|authentic|handcrafted)\b/gi, weight: 2, mapsTo: { emotionalIntent: ['natural'] } },
  { pattern: /\b(joy|delight|playful|fun|happy)\b/gi, weight: 2, mapsTo: { emotionalIntent: ['joy'] } },
  { pattern: /\b(urgent|fast|instant|now|quick|express)\b/gi, weight: 2, mapsTo: { emotionalIntent: ['urgency'] } },
  { pattern: /\b(expert|authority|mastery|professional|certified)\b/gi, weight: 2, mapsTo: { emotionalIntent: ['authority'] } },
];

const CURRENCY_PATTERNS: PrimitiveSignal[] = [
  { pattern: /[$€£₹¥]\s*\d+/, weight: 3, mapsTo: {} },
  { pattern: /\b(USD|EUR|GBP|INR|JPY|CAD|AUD)\b/gi, weight: 3, mapsTo: {} },
];

const LOCALE_PATTERNS: PrimitiveSignal[] = [
  { pattern: /\b(mumbai|delhi|bangalore|chennai|hyderabad|pune|kolkata|india)\b/gi, weight: 3, mapsTo: { locale: 'IN' } },
  { pattern: /\b(london|manchester|birmingham|uk|britain)\b/gi, weight: 3, mapsTo: { locale: 'GB' } },
  { pattern: /\b(paris|lyon|marseille|france)\b/gi, weight: 3, mapsTo: { locale: 'FR' } },
  { pattern: /\b(berlin|munich|hamburg|germany)\b/gi, weight: 3, mapsTo: { locale: 'DE' } },
  { pattern: /\b(tokyo|osaka|japan)\b/gi, weight: 3, mapsTo: { locale: 'JP' } },
  { pattern: /\b(new york|los angeles|chicago|usa|america)\b/gi, weight: 3, mapsTo: { locale: 'US' } },
];

function extractSignals(prompt: string, patterns: PrimitiveSignal[]): Partial<BusinessPrimitives> {
  const result: Partial<BusinessPrimitives> = {};
  for (const { pattern, weight, mapsTo } of patterns) {
    const matches = prompt.match(pattern);
    if (matches && matches.length > 0) {
      for (const [key, value] of Object.entries(mapsTo)) {
        if (Array.isArray(value)) {
          // Arrays accumulate (aestheticSignals, emotionalIntent, contentShape)
          if (!Array.isArray(result[key as keyof BusinessPrimitives])) {
            (result as any)[key] = [];
          }
          (result as any)[key].push(...value);
        } else {
          // Scalars use first-match-wins (valueObject, transactionType, currency, locale)
          if (!(key in result)) {
            (result as any)[key] = value;
          }
        }
      }
    }
  }
  return result;
}

function mergeArrays<T>(...arrays: T[][]): T[] {
  const seen = new Set<string>();
  return arrays.flat().filter(item => {
    const key = String(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function detectValueObject(prompt: string): string {
  const signals = extractSignals(prompt, VALUE_OBJECT_PATTERNS);
  return signals.valueObject ?? 'business';
}

function detectTransactionType(prompt: string): BusinessPrimitives['transactionType'] {
  const signals = extractSignals(prompt, TRANSACTION_TYPE_PATTERNS);
  return signals.transactionType ?? 'lead-capture';
}

function detectContentShape(prompt: string): string[] {
  const signals = extractSignals(prompt, CONTENT_SHAPE_PATTERNS);
  return signals.contentShape ?? ['single-product'];
}

function detectAestheticSignals(prompt: string): string[] {
  const signals = extractSignals(prompt, AESTHETIC_SIGNAL_PATTERNS);
  return signals.aestheticSignals ?? [];
}

function detectEmotionalIntent(prompt: string): string[] {
  const signals = extractSignals(prompt, EMOTIONAL_INTENT_PATTERNS);
  return signals.emotionalIntent ?? [];
}

function detectCurrency(prompt: string): string | undefined {
  const match = prompt.match(/[$€£₹¥]\s*\d+|\b(USD|EUR|GBP|INR|JPY|CAD|AUD)\b/gi);
  if (!match) return undefined;
  const symbol = match[0];
  if (symbol.startsWith('$')) return 'USD';
  if (symbol.startsWith('€')) return 'EUR';
  if (symbol.startsWith('£')) return 'GBP';
  if (symbol.startsWith('₹')) return 'INR';
  if (symbol.startsWith('¥')) return 'JPY';
  return symbol.toUpperCase();
}

function detectLocale(prompt: string): string | undefined {
  const signals = extractSignals(prompt, LOCALE_PATTERNS);
  return signals.locale;
}

/**
 * Main entry point — extracts business primitives from a prompt.
 * Pure function, no side effects, no external dependencies.
 */
export function extractPrimitives(prompt: string): BusinessPrimitives {
  return {
    valueObject: detectValueObject(prompt),
    transactionType: detectTransactionType(prompt),
    contentShape: detectContentShape(prompt),
    aestheticSignals: detectAestheticSignals(prompt),
    emotionalIntent: detectEmotionalIntent(prompt),
    currency: detectCurrency(prompt),
    locale: detectLocale(prompt),
  };
}