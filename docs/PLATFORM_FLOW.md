# Poore Platform ka Flow: Seeker, Partner aur Admin (Click by Click)

> **Note:** Ye hamare **target design** ka explanation hai (jo hum Antigravity se bana rahe hain). Aapke current build me abhi kuch hissa alag ya adhoora ho sakta hai. Is guide ko "kya hona chahiye" ki reference ki tarah use karo.

---

## 0. Pehle badi tasveer (sabke samajhne ke liye)

Platform ek **building** jaisa hai jisme **3 alag darwaze** hain, aur har darwaze par **security guard** hai jo sirf sahi role wale ko andar jaane deta hai.

| Darwaza (Panel) | Kaun use karta hai | Kaam |
|---|---|---|
| **Seeker panel** | Jo service lena chahta hai (movie partner, coffee, travel, elder care, etc.) | Dhundhna, request bhejna, pay karna, meet karna, complete karna |
| **Partner panel** | Jo service deta hai | Profile banana, booking publish karna, request accept karna, kamai nikalna |
| **Admin panel** | Platform chalane wali team | Approve karna, rules/charges set karna, vivad suljhana, paisa aur safety manage karna |

**Paise ki kahani ek line me:** Seeker pay karta hai → paisa platform ke paas **hold** (surakshit) rehta hai → meeting ke baad Seeker ek **4-digit OTP** deta hai → Partner OTP daalta hai → platform apna **commission** kaat kar baaki paisa **Partner ke wallet** me daal deta hai → Partner withdraw karta hai.

**Chhoti dictionary:**

| Shabd | Matlab |
|---|---|
| **Listing** | Partner ki banayi booking offer (kaun si category, kab, kahan, kitne ka) |
| **Request** | Seeker ki taraf se kisi listing par "mujhe ye chahiye" |
| **Booking** | Request accept + payment ke baad bana pakka booking |
| **Escrow / Hold** | Paisa jo OTP verify hone tak partner ko nahi milta (security deposit jaisa) |
| **Commission** | Admin ka category-wise charge jo release par katta hai |
| **KYC** | Partner ki pehchaan ki jaanch (ID documents) |
| **Profile health** | Partner ki profile kitni poori hai (0 se 100%) |
| **Stage color** | Booking ki halat batane wala rang (amber, blue, purple, teal, orange, pink, green, red...) |

**Booking ke stage aur rang (har jagah same):**

| Stage | Matlab | Rang |
|---|---|---|
| Requested | Request gayi, partner ka jawab baaki | Amber (peela-narangi) |
| Accepted | Partner ne haan kaha, ab seeker ko confirm karna hai | Blue |
| Payment pending | Seeker ne confirm kiya, payment baaki | Purple |
| Paid (held) | Paisa surakshit, booking pakki | Teal (hara-neela) |
| In progress | Meeting ka time chal raha hai | Orange |
| Awaiting OTP | Seeker ne Completed dabaya, partner OTP daalega | Pink |
| Completed | Sab theek, paisa release | Green |
| Declined / Cancelled | Mana kiya / cancel hua | Red |
| Expired | Time par kuch nahi hua | Grey |
| Disputed | Vivad, admin dekh raha hai | Dark red |
| Refunded | Paisa wapas hua | Slate (dhusar) |

---

## 1. PWA khulne se session khatam hone tak (sabke liye same)

### 1.1 App kholna

1. User **website link** kholta hai ya phone ke **home screen icon** par tap karta hai.
2. Pehli baar: browser app ka chhota "shell" download karta hai. Doosri baar se ye **turant** khulta hai (service worker ki wajah se), internet slow ho tab bhi.
3. Screen par **purple splash** (logo) dikhta hai, kuch sekundon ke liye.
4. Piche app chup-chaap server se poochta hai: **"Ye kaun hai aur isse kya access hai?"** (ye `/me/access` call hai). Jab tak jawab nahi aata, koi bhi role ka page nahi dikhta (taaki galat page ki jhalak na dikhe).

### 1.2 Teen possible rasta

| Server ka jawab | User ko kya dikhta hai |
|---|---|
| Logged in nahi | **Login screen** |
| Logged in, Seeker | Seeker ka sahi page (plan nahi hai to Plan page, nahi to Seeker Home) |
| Logged in, Partner | Partner ka sahi page (plan/onboarding/status/home, state ke hisaab se) |
| Admin | Admin ka alag login/panel (alag address par) |

### 1.3 Install karne ka option (app jaisa banana)

- **Login/Register screen** ke neeche "Install app" button, **Home header** me chhota download icon, **Profile** me "Install App" row, aur doosri visit par ek chhota banner.
- **Android Chrome:** tap karte hi asli install popup aata hai.
- **iPhone Safari:** ek guide sheet khulti hai (Share → Add to Home Screen).
- **WhatsApp/Instagram ke browser me:** "Chrome/Safari me kholo" ka message aata hai (wahan install nahi hota).
- Install hone ke baad button chhup jata hai.

### 1.4 Chhote par zaroori behavior (aksar ignore hote hain)

- **Offline:** upar patli patti "You are offline". Payment, booking, OTP wale buttons band ho jate hain aur kaaran likha aata hai.
- **Update:** naya version aane par neeche "New version available - Refresh" aata hai. **Payment ke beech me app khud reload nahi hota.**
- **Push notification:** pehle kabhi permission nahi maangta. Jab user Settings me "Turn on notifications" dabaye tab hi maangta hai.
- **Time:** sab time **IST** me dikhte hain, par server UTC me store karta hai.

### 1.5 Login ke tareeke

1. **Password tab:** Email ya phone + password → "Login".
2. **Login with OTP tab:** phone number → "Continue" → 6-digit OTP (resend 30 second baad, max attempts ke baad lock).
3. **Forgot password:** email/phone → OTP → naya password → "Password Updated" popup → login.
4. Galat password par message hamesha **same** rehta hai ("Invalid credentials"), taaki koi ye na jaan sake ki kaun sa account exist karta hai. Kai baar galat hone par kuch der ke liye **lock**.
5. Har step ke baad **popup** aata hai (success hara, error laal, warning peela, info purple).

### 1.6 Session kaise chalta hai

- Login ke baad do chaabi milti hain: ek **chhoti (15 minute)** jo sirf memory me rehti hai, aur ek **lambi (7 din)** jo surakshit cookie me rehti hai.
- Chhoti chaabi khatam hone se pehle app **chup-chaap nayi le leta hai**. User ko kuch pata nahi chalta.
- App ek **live connection** (real-time channel) kholta rehta hai. Isse plan expire, account suspend, role change jaisi cheezein **bina refresh** turant dikh jati hain.
- Notification bell par unread count live update hota hai.

### 1.7 Session kab khatam hota hai

| Kaise | Kya hota hai |
|---|---|
| **User khud Logout dabaye** | Saari saved cache aur data saaf, push band, Login screen |
| **Lambe samay tak use na kare (7 din idle)** | Agli baar "Session expired" popup → Login |
| **30 din poore (absolute limit)** | Dobara login zaroori |
| **Admin panel** | Sirf **15 minute idle**; 60 second pehle warning "Stay logged in?" |
| **Password badla / admin ne force logout kiya / suspicious activity** | Sab devices se turant logout |
| **Plan expire** | Logout nahi hota. User Plan page par bheja jata hai (data surakshit rehta hai) |
| **Doosre tab me logout** | Saare tabs 2 second me Login par aa jate hain |

**Session expire hone par:** screen par popup "Session expired, please login again" → Login → login ke baad user wapas **usi page par** aata hai, **agar wo page uske role ke liye allowed ho**.

**Profile > Logged-in devices** me user dekh sakta hai ki kin devices par login hai, aur "Logout all devices" dabakar sabko nikal sakta hai.

---

## 2. SEEKER PANEL (service lene wala)

### 2.1 Account banana (click by click)

1. Login screen par **"Register Now"** dabao.
2. **Create Account** form (purple screen, white card). Fields: Mobile (+91), Email, Password, Confirm Password, Full Name, Pincode, City, Gender, "I want to".
3. **Pincode** me 6 digit likhte hi app server se poochta hai → popup **"📍 Address Found! City: Indore, State: Madhya Pradesh"** → OK. City khud bhar jati hai (user badal nahi sakta).
4. **"I want to"** me **"Find a partner"** chuno (isse role = Seeker ban jata hai).
5. Neeche ek checkbox: "Main 18+ hoon aur Terms, Privacy aur Code of Conduct se sehmat hoon" (ye record hota hai).
6. **Create Account** dabao → popup **"🎉 Registration Successful! Welcome, {Name}"** → **Continue Now**.
7. **Phone OTP** screen → 6-digit OTP daalo → popup "Phone Verified!".
8. Direct **Choose Your Plan** page.

### 2.2 Plan kharidna

1. Plan cards (6 months / 1 year / lifetime jaise) dikhte hain. Har card par naam, price, **"+ GST"**, features, aur radio button.
2. Ek plan chuno → neeche ka button **"Continue - Rs {total}"** active ho jata hai.
3. **Checkout screen:** plan, price, GST, total, optional coupon, refund policy link. **"Pay securely"**.
4. Razorpay ka payment screen (UPI/card/netbanking).
5. Payment ke baad **"Payment Processing"** popup (kuch second tak server confirm karta hai).
6. Confirm hote hi popup **"🎉 Payment Successful"** (plan ka naam aur validity) → **Go to Dashboard**.
7. Ab Seeker Home khulta hai. Back dabane par checkout par wapas nahi jata.

### 2.3 Seeker Home (upar se neeche)

1. **Header:** photo, "Hello, Name", notification bell (laal count).
2. **Action Required strip (sirf jab kuch karna ho):** jaise "Riya ne accept kiya - Confirm karo (24 min bache)". Rang stage ke hisaab se.
3. **Next booking card:** agla booking, tarikh/samay/jagah, stage chip.
4. **Categories grid:** Movie, Coffee, Travel, Elder Care, etc. (admin jo banata hai wahi dikhte hain).
5. **Near you:** apne shehar ki khuli listings (horizontal scroll).
6. **"Become a Partner" card:** sirf tab jab role allow kare.
7. **Neeche navigation:** Home | Bookings | History | Profile.

### 2.4 Seeker partner ko kaise dhundhta hai

1. Home par kisi **category** par tap → **Book** → us category ka page.
2. Is page par **us category ki saari khuli listings** aati hain (jo shehar me hain, jo abhi book nahi hui).
3. Har listing card me: partner ki **photo, pehla naam, umar**, shehar/area, occupation, top interests, languages, **kab, kitne ghante, kitne ka (GST sahit)**, rating, aur ek chhota **match %** badge.
4. **Filters** (upar icon → neeche se sheet khulti hai):
   - **Location:** shehar/area/pincode aur door tak (km).
   - **Age:** umar ka range.
   - **Interests, Hobbies, Occupation, Languages.**
   - **Smoke / Drink:** koi bhi, sirf non-smoker, smoker chalega (partner ne jo bataya wahi).
   - **Date/time, Price, Rating, Verified only.**
   - Active filters chhote chips ban kar dikhte hain; "Reset" se hat jate hain. Filters link me yaad rehte hain.
5. **Sort:** jaldi wali, sasti, rating, nazdeek, best match.
6. Khaas rule: **dono taraf ki sehmati** (gender). Seeker sirf wahi listings dekhta hai jinke partner ne uske gender ko allow kiya hai, aur jinhe seeker ne chuna hai.
7. Agar kuch na mile: "Abhi koi booking nahi" + **"Notify me"** (nayi listing aate hi notification) + filter chaudha karne ka suggestion.

### 2.5 Partner ka detail page

Card par tap karne par:
- **Photos** ka carousel (swipe), naam, umar, verified badge.
- **Bio, occupation, interests, hobbies, languages, smoke/drink** (jaisa partner ne bataya).
- **Listing details:** kab, kitna samay, kis **public jagah ka naam**, category ke safety notes. **Poora address abhi nahi** dikhta (payment ke baad khulta hai).
- **Price breakdown preview** aur reviews.
- **Teen-dot menu:** Report, Block.
- **Heart icon:** partner ko save karna.
- Sabse neeche bada button **"Send Request"**.
- Phone number, email, ya exact address **kahin bhi nahi** dikhta.

### 2.6 Request bhejna

1. **Send Request** dabao → (optional) chhota message likho (phone/link likhne par filter rok deta hai) → confirm.
2. Popup: **"Request sent"**. Booking card **amber (Requested)** ho jata hai.
3. Ek countdown: partner ke jawab ka samay (admin tay karta hai, jaise 12-24 ghante).
4. Seeker **Bookings tab → Requested** me dekh sakta hai, aur kabhi bhi **Withdraw** kar sakta hai (free).
5. Ek hi listing par ek seeker ki ek hi active request.

**Ab 4 me se kuch bhi ho sakta hai:**

| Natija | Seeker ko kya milta hai |
|---|---|
| Partner **Accept** karta hai | Notification + push "Booking accepted" → card **blue** |
| Partner **Decline** karta hai | Notification "Declined" (reason ke saath) → card red |
| Kisi **aur ki request accept** hui | "Slot taken" → card red/grey |
| Samay nikal gaya | "Request expired" → card grey |

### 2.7 Accept ke baad: Confirm aur Payment

1. Blue card par bada button **"Confirm booking"** aur **countdown** (jaise 30 minute). Isi dauran ye slot sirf aapke liye roka jata hai.
2. Countdown me confirm na kiya to request **expire** ho jati hai aur listing dobara khuli ho jati hai.
3. **Confirm** dabao → card **purple (Payment pending)**.
4. **Payment screen** par:
   - Service, partner ka pehla naam, samay, jagah ka naam.
   - **Price + GST = Total.**
   - Ek hara **"Aapka payment surakshit hai"** card jisme saaf likha hai:
     1. Aapka paisa abhi partner ko **nahi** milta, platform ke paas safe rehta hai.
     2. Milne ke **baad** booking me jaakar **"Mark as Completed"** dabao.
     3. Screen par **4-digit OTP** aayega.
     4. OTP partner ko **sirf milne ke baad** batao.
     5. Partner OTP daalega tab hi payment release hoga.
   - Chetavni: milne se pehle OTP kabhi mat do, app ke bahar payment mat karo, dikkat ho to SOS/Report.
   - Cancellation/refund policy ka checkbox.
5. **Pay** → Razorpay → "Payment Processing" → popup **"🎉 Payment Successful"**.
6. Booking **teal (Paid - held)** ho gaya. Ab **poora address** khul jata hai.

### 2.8 Payment ke baad aur meeting se pehle

Booking detail page par ye sab milta hai:
- **Timeline** (har stage kab hua).
- **Poora venue address + "Open in Maps" button.**
- **Chat** partner ke saath (phone/email/link bheje nahi ja sakte).
- **Add to calendar** (reminder file).
- **Reminders:** 24 ghante, 2 ghante aur 30 minute pehle notification.
- **Share with trusted contact:** ek link jisme dost/parivar booking ka samay, jagah aur partner ka pehla naam dekh sake (booking ke baad link band).
- **Cancel:** refund admin ki table ke hisaab se (jitna pehle cancel, utna zyada refund). Partner cancel kare to **100% refund** milta hai.
- **Report / Block / SOS** hamesha upar ke menu me.
- **Booking ID copy** karne ka button (support ke liye).

### 2.9 Meeting ka din

1. Meeting ka samay shuru hote hi stage khud **orange (In progress)** ho jata hai.
2. Beech me safety check-in notification: **"Aap theek hain?"** (ek tap me jawab).
3. Milne ke **baad** seeker booking me jaata hai aur **"Mark as Completed"** dabata hai. Pehle ek chetavni: *"Ye tabhi dabao jab aap partner se mil chuke ho."*
4. Card **pink (Awaiting OTP)**. Screen par **4 bade digits ka OTP** (Rapido jaisa) aur likha: "Ye OTP partner ko sirf milne ke baad batao." OTP ki expiry hai, aur kuch baar dobara banaya ja sakta hai.
5. Seeker OTP partner ko **bolkar** batata hai. (OTP kabhi SMS/push/email me nahi jata, sirf seeker ki screen par dikhta hai.)
6. Partner apni screen par OTP daalta hai → server check karta hai → card **green (Completed)**, popup **"Booking completed"**.
7. **Review screen** khulti hai: star rating + comment (comment moderate hota hai).
8. **Invoice/receipt** download.

### 2.10 Agar kuch galat ho

| Sthiti | Seeker kya kare / kya hoga |
|---|---|
| Partner aaya hi nahi | Booking me **"Partner did not show"** report → refund ya admin review |
| Seeker mil chuka par partner OTP nahi daal raha | OTP ek hi baar chalta hai, partner ko dobara daalna hoga; 5 galat attempts par lock |
| Seeker ne Completed nahi dabaya, partner ne "Service delivered" dabaya | Ek tay samay (jaise 24 ghante) ke andar seeker **Dispute** kar sakta hai, warna paisa **auto-release** ho jata hai |
| Seeker dispute karta hai | Paisa **freeze**, admin dekhta hai (refund, release ya beech ka faisla), dono ko notification |
| Payment fail/band hua | "Retry" se naya payment; double charge nahi hota |

### 2.11 Seeker ki Bookings aur History

- **Bookings tab:** All | Requested | Accepted | Payment | Paid | In progress | Completed | Cancelled (har tab me count). Har card par stage ka rang aur ek chhoti **stepper line**. Khali ho to "No Bookings Found" + Clear Filters.
- **History tab:** membership aur booking ke payments (Success/Pending/Failed/Expired), filter, detail sheet (Order ID, type, time, amount), invoice.

### 2.12 Seeker ka Profile aur chhoti suvidhayein

- Photo (camera/gallery/view/remove), phone/email badalna (OTP se dobara verify), naam, shehar/pincode.
- **Preferences:** kis gender ke partners dekhne hain.
- **Emergency/trusted contact** (SOS ke liye).
- **Membership card:** plan, kab tak, Renew.
- **Notification settings:** booking, payment, safety, offers (offers by default **band**, user chalu kare to hi).
- **Change password, logged-in devices, logout all.**
- **Help & Support:** FAQ khoj, emergency numbers (112, 100, 1091), ticket banana, apne tickets dekhna.
- **Legal pages:** Privacy, Terms, Code of Conduct, Refund, Safety.
- **Data export / Account delete** (apne data ki copy ya hatane ki request).
- Saved partners, Notify-me alerts ki list, **Install App**, app version + "Check for updates".

### 2.13 Plan khatam hone par

- 3 din aur 1 din pehle notification + upar patti "Plan 3 din me khatam".
- Khatam hote hi (live) user **Plan page** par aa jata hai. Purane bookings aur history surakshit rehti hain, par naye request/booking nahi ban sakte.
- Renew karte hi turant wapas usi page par.
- (Agar koi booking chal rahi ho to wo apna flow poora kar sakti hai.)

### 2.14 Seeker kya NAHI kar sakta

- Partner panel ke koi page ya API kholna.
- Listing banana, kisi ki request accept karna, wallet/withdraw.
- Partner ka phone/email/exact address dekhna.
- Platform ke bahar payment karna (chat me contact bhejne par block).
- Apna role khud badalna.

---

## 3. PARTNER PANEL (service dene wala)

### 3.1 Partner kaise bana ja sakta hai (2 raaste)

| Raasta | Kya hota hai |
|---|---|
| **A. Seedha register** | Register me "I want to" → **"Become a partner"** chuno. Account ka role shuru se **Partner**. |
| **B. Seeker se upgrade** | Seeker Home ya Profile me **"Become a Partner"** → partner plan kharido → role **Seeker se Partner** ho jata hai (EXCLUSIVE rule me seeker pages band ho jate hain, isliye pehle chal rahi seeker bookings poori honi chahiye; ek confirm popup me ye likha aata hai). |

**Dhyan:** Partner bannne ke liye 4 cheezein zaroori hain: **(1) partner plan, (2) poori profile, (3) KYC approved, (4) admin ki profile approval.** Inme se ek bhi baaki ho to "Create Booking" band rehta hai.

### 3.2 Partner plan kharidna

1. Register (ya upgrade) ke baad **Partner Plans** page: plan cards (price + GST + partner ke features).
2. Plan chuno → Continue → Razorpay → "Payment Processing" → **"Payment Successful"** popup.
3. App ko live signal milta hai, aur user apne aap **Partner Onboarding** par pahunch jata hai (seeker home par nahi).
4. Header me **"PARTNER MODE"** pill aur partner ka alag navigation dikhta hai: **Home | Requests | Listings | Wallet | Profile**.

### 3.3 Onboarding wizard (step by step)

Upar ek **Profile Health ring** (0-100%) rehta hai: **laal (<40), narangi (40-69), peela (70-89), hara (90+)**. Har step par **autosave** hota hai, aur app band karke wapas aane par wahin se shuru hota hai jahan chhoda tha.

| Step | Kya bharna hai | Kyun |
|---|---|---|
| 1. Basics | Display name, **date of birth** (18+ zaroori), gender, **main photo** | Pehchaan aur umar ka proof |
| 2. Location | Pincode (shehar khud aata hai), area | Seeker shehar/area se dhundhta hai (ghar ka pata kabhi nahi liya jata) |
| 3. About & Lifestyle | **Bio** (kam se kam 80 akshar), **occupation**, **smoke** aur **drink** (Never / Occasionally / Regularly / Prefer not to say) | Seeker ke filters ke liye |
| 4. Interests, Hobbies, Languages | Interests (min 3), hobbies (min 3, max 20), languages | Match % aur filters ke liye |
| 5. Categories & Rates | **Admin ki banayi categories** me se chuno, har ek ka **ghante ka rate** (admin ke min-max ke andar) | Kaun si service dena hai aur kitne me |
| 6. Photos | Kam se kam **3**, zyada se zyada **8** photos; kramm badal sakte ho, ek ko main banao | Seeker ko dikhne wali profile |
| 7. KYC | Documents upload (neeche) | Safety aur bharosa |
| 8. Review & Submit | Sab ek nazar me, **Submit for review** | Admin ko bhejna |

**Rules jo chup-chaap lagte hain:** bio/hobbies/interests me phone number, email, link, "DM me", adult ya paise-ke-bahar wale shabd likhne par **rok** lag jati hai aur kaaran dikhta hai. Photos ka type/size check hota hai.

**"Next best actions":** health card ke neeche list: "Add 2 more photos (+5%)", "Add hobbies (+5%)". Tap karte hi wahi section khulta hai.

### 3.4 KYC (pehchaan ki jaanch)

1. KYC step me **documents upload** karne hain: ek **photo ID** (Aadhaar ka **masked** copy, Voter ID, Driving Licence ya Passport), **PAN**, aur ek **selfie** (admin ke set ki hui list ke hisaab se).
2. Upload se pehle likha rehta hai ki documents kyun liye ja rahe hain, kaun dekhega aur kab delete honge. Ek **consent checkbox** hota hai.
3. Files **private aur encrypted** jagah par jati hain. Kisi aur user ko kabhi nahi dikhti.
4. **Submit KYC** → status **Submitted**.
5. Admin ki KYC team documents dekhti hai. Natija:
   - **Approved:** partner ko notification.
   - **Needs changes:** kaaran ke saath (jaise "photo dhundhli hai"), partner dobara upload karta hai.
   - **Rejected:** kaaran ke saath, support ka option.
6. Faisle ke kuch din baad documents **delete** ho jate hain, sirf natija aur ID ke aakhri 4 digit rehte hain.

### 3.5 Submit ke baad

1. **Status screen:** timeline **Submitted → Under review → Approved**. Is dauran profile **edit** ho sakti hai.
2. Admin profile (photos, bio) bhi check karta hai. Galat ho to **"Needs changes"** + kaaran.
3. Approve hote hi partner ko push + in-app notification aur **live signal**: app apne aap **Partner Home (Live)** par le jata hai, aur **Create Booking** khul jata hai.
4. Agar partner plan bich me expire ho jaye to state **Paused** ho jati hai: listings band, **Renew** page.

### 3.6 Rate kaise tay hota hai

1. Admin har category ke liye **minimum, maximum aur default** rate tay karta hai.
2. Partner profile me har category ka **ghante ka rate** daalta hai (is range ke andar hi).
3. Listing banate waqt **price = rate × ghante**, aur partner use range ke andar thoda badal bhi sakta hai.
4. **Seeker ko dikhta hai:** price + GST.
5. **Partner ko dikhta hai (publish se pehle):** ek **kamai calculator**: "Seeker ke pay karne par aapko lagbhag Rs X milenge (platform fee aur tax ke baad)". Isse surprise nahi hota. (Commission ka final hisaab booking ke samay ka **snapshot** hota hai.)

### 3.7 Booking (Listing) publish karna

**Create Booking** (Partner Home ya Listings tab se):
1. **Category** chuno (sirf wahi jo aapne profile me chuni hain).
2. **Date aur time** chuno (kam se kam kuch ghante baad ka, aur kuch din ke andar; admin ki limit).
3. **Duration** chuno (category ke allowed options me se).
4. **Price** auto bhar jata hai (range ke andar edit).
5. **Shehar/area** (profile se aata hai).
6. **Venue ka type** (cafe, mall, cinema, restaurant, park, event venue, hospital, market...) aur **public jagah ka naam**. Poora address alag se bharna hai, wo seeker ko **payment ke baad** dikhega. Ghar jaisi private jagah sirf unhi categories me jo admin ne allow ki hain (jaise elder care), extra checks ke saath.
7. **Description** (optional, moderate hota hai).
8. **Live preview:** bilkul waisa card jaisa seekers dekhenge.
9. **Safety acknowledgement** checkbox.
10. **Publish** → listing **Open** hoti hai aur seekers ko category page par dikhne lagti hai.

**Rules:** do listings ek hi samay par overlap nahi kar sakti. Gating poori na ho to button band aur kaaran likha.

**Listings tab me:** Open / Held / Booked / Closed / Expired (stage chips ke saath), har listing par **Edit** (jab tak koi accept na ho), **Close**, **Duplicate** (agle hafte ke liye), aur **calendar view**. Samay beet jaane par khuli listing khud **Expired** ho jati hai.

### 3.8 Request aana aur uska jawab dena

1. Seeker request bheje to partner ko **push + in-app notification** milti hai aur **Requests tab** (aur Home ke "Action required") me **amber** card aata hai.
2. Card me: seeker ka **pehla naam, umar, photo, shehar, rating, kitni baar book kiya**, uska **message**, kaun si listing, aur **kitna samay bacha** (countdown). Phone/email kabhi nahi.
3. **Decline** → (optional kaaran) → seeker ko notification.
4. **Accept** →
   - Listing **Held** ho jati hai (slot roka gaya).
   - Isi listing ki **baaki saari requests apne aap decline** ho jati hain ("slot taken").
   - Seeker ko notification aur confirm karne ka countdown.
5. Seeker ne tay samay me **confirm + pay** nahi kiya to accept **expire** ho jata hai aur listing wapas **Open** (partner dusre ko accept kar sakta hai).
6. Partner ke liye ek simple niyam: **ek listing ka ek hi seeker**.

### 3.9 Payment ke baad aur meeting se pehle

- Notification: **"Payment received, booking confirmed"** (teal).
- Booking detail: seeker ka pehla naam/umar/photo, samay, **poora address jo partner ne diya tha**, chat, reminders (24h/2h/30m), SOS/Report/Block.
- **Cancel:** partner cancel kare to seeker ko 100% refund, aur partner ke **reliability score** par asar padta hai. Baar-baar cancel karne par warning/suspension.

### 3.10 Meeting ka din aur paisa milna

1. Samay shuru hote hi **orange (In progress)**.
2. Meeting ke baad partner **intezaar** karta hai. Seeker "Mark as Completed" dabayega to partner ki screen par **pink "Awaiting OTP"** aayega.
3. Seeker OTP bolta hai → partner **Enter OTP** screen par **4 digit** daalta hai.
4. Server check karta hai:
   - **Sahi:** booking **green (Completed)**, aur popup: **"Payment released to your wallet: Rs X"** with breakdown (price, platform fee, GST, **net**).
   - **Galat:** attempts ka counter; **5 galat par 30 minute lock** aur admin ko flag.
5. **Agar seeker OTP nahi de raha:** meeting ka samay khatam hone ke baad partner **"Service delivered"** dabata hai. Phir ek tay samay (jaise 24 ghante) tak seeker ke paas dispute ka mauka hai; na kiya to paisa **auto-release**. Dispute hua to admin faisla karta hai.
6. Partner ko kabhi seeker se OTP **pehle** nahi maangna chahiye (rules me manaa hai, shikayat par action).

### 3.11 Wallet aur Withdrawal

**Wallet screen par 3 amount:**
- **Pending (held):** jo paisa abhi escrow me hai.
- **Available:** jo nikal sakte ho.
- **Lifetime earned:** ab tak ki kul kamai.
- Neeche **ledger:** har booking ka breakdown (price, fee, GST, net), withdrawals, refunds.

**Withdraw karne ke steps:**
1. Pehli baar: **bank account (IFSC) ya UPI** daalo. System chhote verification (naam match) se check karta hai. Number masked dikhta hai (jaise ****1234).
2. **Withdraw** → amount (minimum limit aur release ke kuch din baad ki hold ke niyam ke saath) → confirm.
3. Amount **lock** ho jata hai (do baar kharch nahi ho sakta).
4. Status: **Requested → Approved → Processing → Paid** (ya Failed/Rejected, tab paisa wapas wallet me).
5. Admin ki setting ke hisaab se approval **auto** ya **manual** hoti hai. Har status par notification.
6. Payout details badalne par kuch der ka **cooling period** aur dobara verification.

### 3.12 Partner Profile aur chhoti suvidhayein

- **Profile editor:** sab kuch kabhi bhi badal sakte ho. Photos/bio badalne par dobara **moderation** (kuch samay profile review me).
- **"Preview as seekers see"** button.
- **Pause my listings** (chhutti mode): naye request band, purane bookings nibhane honge.
- **Reviews received**, rating, **reliability score** (accept rate, cancel, no-show).
- **Allowed seekers:** kis gender ke seekers request bhej sakte hain.
- **Membership card:** plan, kab tak, Renew.
- **Payout details**, notification settings, devices, change password, help, legal, data export/delete, install app.
- Insights (jaise listing kitni baar dekhi gayi, request kitni aayi), agar chalu kiye gaye ho.

### 3.13 Partner kya NAHI kar sakta

- Seeker panel ke pages ya APIs kholna.
- Seeker ka phone/email dekhna ya mangna.
- Platform ke bahar paisa lena ya tip maangna (rules me **permanent ban** ka kaaran).
- Bina KYC + approval ke listing publish karna.
- Apna role khud badalna ya commission/rate range badalna.
- Pichhle kisi aur partner ka data dekhna.

### 3.14 Seeker panel aur Partner panel me fark (ek jagah)

| Cheez | Seeker | Partner |
|---|---|---|
| Header | Normal | **"PARTNER MODE"** pill + alag nav rang |
| Navigation | Home, Bookings, History, Profile | Home, Requests, Listings, Wallet, Profile |
| Home par kya | Categories, Near you, Next booking | Profile health, requests, earnings, shortcuts |
| Paisa | Deta hai (price + GST) | Leta hai (price - fee - GST), wallet hai |
| Plan | Seeker plan | Partner plan |
| Onboarding | Sirf OTP + plan | Profile + KYC + admin approval |
| Listing banana | Nahi | Haan |
| Request | Bhejta hai | Accept/Decline karta hai |
| OTP | Seeker ki screen par **dikhta** hai | Partner **daalta** hai |
| Withdraw | Nahi | Haan |
| Data jo dusre ko dikhta hai | Pehla naam, umar, photo | Pehla naam, umar, photos, bio, interests, languages |

---

## 4. ADMIN PANEL (platform chalane wali team)

### 4.1 Admin panel me kaise jaate hain

- **Alag address** (jaise `admin.yourdomain.com`), seekers/partners ke app se bilkul alag.
- **Public registration nahi hai.** Admin account sirf **Super Admin ke invite** se banta hai.
- Login: email + password + **2FA (authenticator code)** zaroori. Bina 2FA ke andar nahi ja sakte.
- **15 minute idle** par auto-logout (60 second pehle warning). Optional: sirf office IP se login.
- Har click jo kuch badalta hai, **audit log** me likha jata hai (kisne, kab, kya badla, purana aur naya value, kaaran).

### 4.2 Admin ke andar alag-alag log (sub-roles)

Sabko sab kuch nahi dikhta (least privilege):

| Sub-role | Kya dekh/kar sakta hai |
|---|---|
| **Super Admin** | Sab kuch, staff banana, settings, roles |
| **KYC Reviewer** | Sirf KYC queue aur documents |
| **Moderator** | Profile/photos/bio/review moderation, reports |
| **Finance** | Payments, refunds, commission, withdrawals, reconciliation |
| **Support** | Tickets, user lookup (limited), disputes ki jaankari |

### 4.3 Left menu ke modules (click by click)

**1) Dashboard**
- Aaj/hafta/mahina ke aankde: naye users, live partners, active plans, bookings, revenue, cancellation rate, open reports, pending KYC, pending withdrawals.
- Charts date filter ke saath; "Needs attention" list (SLA toot rahi hai, SOS alert, fail hue payouts).

**2) Users (Seekers aur Partners)**
- Search (naam/phone/email/ID) → profile kholo → dekho: role, plan, bookings, payments, reports, device sessions, notes.
- Actions (har ek par **kaaran likhna zaroori**): **Suspend / Restore, Force logout (sab devices), Reset sessions, Add internal note, Plan manually extend/cancel (Super Admin/Finance)**.
- Role change sirf **Super Admin** kar sakta hai, aur wo bhi shartein poori hone par (neeche section 5).

**3) Partner Approvals (profile moderation)**
- Queue me har partner: photos, bio, interests, categories, rates. Moderation flags highlight hote hain (jaise phone number likha tha).
- **Approve / Reject / Needs changes** + kaaran. Partner ko turant notification.

**4) KYC Review**
- Queue me status: Submitted, Under review, Needs changes. SLA timer.
- Kholne par: partner ki profile **side-by-side**, documents ka viewer (zoom/rotate). Document ka link sirf **5 minute** chalta hai aur har baar dekhne ka **log** banta hai. Naam aur DOB profile se match hint.
- **Approve / Needs changes / Reject** + checklist + kaaran.
- Approve hote hi partner ka status badalta hai aur wo (baaki shartein poori hone par) live ho sakta hai.

**5) Categories aur Commission**
- **Category banana/edit:** naam, icon, rang, order, active/inactive, **min/max/default rate**, allowed durations, extra KYC chahiye ya nahi, ghar jaisi venue allow hai ya nahi, safety notes.
- **Commission rule:** percent, flat, ya dono, **minimum aur maximum fee**, fee par GST. **Kab se lagu** (effective date) bhi tay hoti hai.
- Ek **live calculator**: price daalo to turant dikhta hai ki commission, GST aur partner ko kitna milega.
- Category kabhi delete nahi hoti agar listings usse judi hain (sirf inactive hoti hai).

**6) Plans, Coupons, Offers**
- Plans banana (naam, audience Seeker/Partner, price, duration, features, "popular" tag).
- Coupons/offers: validity, usage limit. Strikethrough price tabhi dikhta hai jab asli purana price ho.

**7) Listings aur Bookings**
- Sab listings/bookings search karo. Booking kholo → poori **timeline** (kisne kab kya kiya), payment, chat ka zaroori hissa (sirf dispute/report ke case me), stage.
- Zarurat par **cancel/refund** kar sakte ho (kaaran ke saath).

**8) Disputes**
- Queue: kaun, kis par, kaaran, evidence, chat ka hissa, paisa freeze hai.
- Faisla: **Full refund / Release to partner / Split (percent)** + kaaran. Click karte hi paisa wahi jaata hai, dono ko notification. Ek baar appeal ka option.

**9) Payments, Refunds, Reconciliation**
- Saare payments (membership, booking, refund), status filter, Order ID.
- **Refund** karna, **reconciliation** (Razorpay ke record vs hamare database me mismatch pakadna), CSV export, invoices.

**10) Withdrawals (Partner payouts)**
- Queue: partner, amount, method (masked), kab maanga.
- **Approve / Reject** (ya auto mode), bulk approve limit ke saath, fail hue payouts retry, **Freeze withdrawals** (kisi partner par dispute/fraud ho to).
- Withdrawal minimum, hold days, daily limit yahin se tay hote hain (Settings me).

**11) Safety (Reports aur SOS)**
- **SOS live queue** (sabse upar, real-time): kaun, kahan (booking ke dauran location), emergency contact ko message gaya ya nahi. Admin turant call/action le sakta hai.
- **Reports queue:** user ne kisko kis kaaran se report kiya, evidence, **SLA timer** (admin ka tay kiya hua samay). Action: **Warn / Suspend / Ban / Dismiss** + kaaran.
- Auto-flag hue content (phone number, adult shabd, payment bypass) ki list.

**12) Reviews Moderation**
- Flag hue ya naye reviews, hide/approve.

**13) Support Tickets**
- Inbox: category (booking, payment, account, safety, KYC), priority (safety = HIGH). Assign, jawab dena, close. Pehle jawab ka samay naapna.

**14) CMS (content)**
- **Pages:** Privacy, Terms, Code of Conduct, Refund, Safety, About ko edit/preview/**publish**. Publish par **version** badhta hai aur users se **dobara sehmati** li jati hai. Purane version par **rollback**.
- **FAQs, banners, Home ki trust tiles, Company settings** (company ka naam, support phone/email/hours, grievance officer, emergency numbers).

**15) Notifications**
- Templates edit karna, **broadcast** bhejna (sirf unhe jinhone offers allow kiye hain).

**16) Settings (global timers aur rules)**
- Request expiry, **confirm window**, minimum lead time, max advance days, **auto-release hours**, **OTP expiry**, **cancellation refund table**, withdrawal minimum/hold days/approval mode, KYC required documents aur retention days, session timeouts.

**17) Staff aur Roles**
- Naya staff **invite**, sub-role assign, 2FA reset, deactivate. Kisi ka bhi access ek click me hata sakte hain.

**18) Audit Log**
- Filter: kisne, kya, kab. Export. Koi bhi entry **badli ya mitayi nahi ja sakti**.

**19) Analytics aur Reports**
- Category/city wise revenue, funnel (request → accept → pay → complete), cancellations, partner reliability, cohort/retention, commission earned, GST report.

**20) Data Requests (privacy)**
- Users ki "mera data do" ya "delete karo" requests, deadline timer, process.

**21) System Health**
- Failed webhooks, payment jobs, queue backlog, errors, uptime.

### 4.4 Admin poori site ka data globally kaise sambhalta hai

1. **Sabhi rules database me hote hain**, code me chhipe nahi: categories, rates, commission, timers, plans, content.
2. Backend har kaam ke samay **wahi settings padhta hai** (thodi der ki cache ke saath). Admin kuch badalta hai to cache turant saaf hoti hai.
3. Badlav **real-time** me users tak pahunchte hain (live channel): jaise category band hui to Home se turant hat jati hai; plan cancel hua to user ka access turant badal jata hai.
4. **Snapshot ka rule:** jab booking pay hoti hai, us samay ki price, GST aur commission booking me save ho jati hai. Baad me admin commission badle to **purani bookings par asar nahi** padta.
5. **Effective dating:** admin "kal se naya commission" tay kar sakta hai.
6. **Har badlav ka record:** audit log (kisne, kab, purana, naya).

**Udaharan 1: Admin Movie category ka commission 15% se 18% karta hai**
1. Categories → Movie → Commission edit → 18% → effective date chuno → calculator me test → Save (kaaran likho).
2. **Naye** booking par 18% lagega. Jo booking pehle pay ho chuki unpar **15% hi** rahega.
3. Audit log me entry. Finance ko notification (optional).

**Udaharan 2: Admin kisi partner ko suspend karta hai**
1. Users → partner → Suspend → kaaran → confirm.
2. Turant: partner ki saari khuli listings band, naye requests band, partner ko "Account suspended" ki screen, aur live signal se uska khula app usi second redirect.
3. Chal rahi bookings par admin ko decision lena hota hai (cancel/refund ya poori karne dena). Withdrawals freeze optional.

---

## 5. ROLES KAISE ASSIGN HOTE HAIN AUR BYPASS KYON NAHI HO SAKTA

### 5.1 Roles

| Role | Kisko milta hai | Kaise |
|---|---|---|
| **SEEKER** | Service lene wale | Register me "Find a partner" chunne par |
| **PARTNER** | Service dene wale | Register me "Become a partner" chunne par, ya seeker ke **upgrade** (partner plan kharid kar) |
| **ADMIN** (sub-roles) | Sirf staff | Super Admin ke **invite** se, alag login par, 2FA ke saath |

### 5.2 Role assign hone ke saaf niyam

1. **User kabhi apna role khud nahi badal sakta.** App me aisi koi API hi nahi jisme user role bhej sake. Agar koi request me "role" bhej bhi de to server use **ignore** karta hai.
2. Role sirf **server** badalta hai: registration ke samay, partner upgrade ke payment ke baad, ya Super Admin ke action se (kaaran + audit log).
3. Role badalte hi **purane saare login tokens bekaar** ho jate hain (har account ka ek "access version" number badh jata hai) aur naye role ka naya session banta hai.
4. Pehla Super Admin sirf **server setup (seed)** se bana hota hai, public screen se nahi.
5. Default policy: **ek account = ek role** (EXCLUSIVE). Chaho to ek account me dono role (DUAL) ka option hai, par tab bhi **ek samay me ek hi role active** hota hai aur switch server se verify hota hai.

### 5.3 8 tarah ke guard (ek toote to doosra rok le)

Socho: building ka gate, lift ka card, floor ka lock, room ka lock... sab alag-alag.

| # | Guard | Kya karta hai |
|---|---|---|
| 1 | **Screen guard (app)** | Galat role ka page kholte hi sahi page par bhej deta hai. Sirf suvidha hai, asli suraksha nahi. |
| 2 | **API role check** | Har server call par dekhta hai ki user ka role is API ke liye allowed hai ya nahi (Seeker ki API alag, Partner ki alag, Admin ki alag) |
| 3 | **Plan/entitlement check** | Plan active hai ya nahi, har baar database se dekha jata hai |
| 4 | **State check** | Partner ki halat (KYC pending, live, suspended) ke hisaab se kaun sa kaam allowed hai |
| 5 | **Ownership check** | Sirf **apna** data: ek user doosre ki booking/wallet/ID nahi khol sakta |
| 6 | **Data filter** | Query hamesha "sirf is user ka" ke saath chalti hai, aur response me role ke hisaab se hi fields jate hain |
| 7 | **Live revocation** | Role/plan/suspend badalte hi purane tokens band aur app turant redirect |
| 8 | **Audit + alerts** | Har inkar (denied) log hota hai, baar-baar koshish par alert aur lock |

### 5.4 Koshish karne par kya hoga

| Koshish | Natija |
|---|---|
| Partner `/s/home` type kare | Redirect apne partner page par + chhota message; seeker ka koi data/code load nahi hota |
| Seeker `/p/home` type kare | Redirect `/s/home` par; partner API ko koi call nahi jati |
| Seeker apne token se seedhe partner API (jaise `/partner/listings`) call kare | **403 Wrong role** |
| Browser ki saved value (localStorage) badal kar role fake kare | **Koi asar nahi**, role server se aata hai |
| Nakli token banaye | Signature check fail → **401** |
| Purana token reuse kare (role/plan badalne ke baad) | **401 Access changed** → naya login zaroori |
| Request ke andar `"role":"ADMIN"` bhej de | **Ignore**, role nahi badalta |
| Kisi aur ki booking ka ID badal kar kholna (ID guessing) | **Not found/Forbidden** |
| Seeker/partner `/admin` kholne ki koshish kare | Admin alag address par hai; wahan role ADMIN + 2FA chahiye, nahi to inkar |
| Plan expire hone ke baad purane page par ruke rahna | Live event se turant plan page par redirect, aur API **402 Plan required** |
| Partner KYC se pehle listing banane ki API call | **403 State not allowed** |
| Bahut baar galat koshish (brute force) | Rate limit, temporary lock, admin alert |
| Unknown URL | Seedha **404** (kisi aur page par nahi) |

### 5.5 Kaun kya dekh sakta hai (access matrix)

| Cheez | Seeker | Partner | Admin |
|---|---|---|---|
| Seeker pages (`/s/*`) | ✅ | ❌ | ❌ |
| Partner pages (`/p/*`) | ❌ | ✅ (state ke hisaab se) | ❌ |
| Admin panel | ❌ | ❌ | ✅ (sub-role ke hisaab se) |
| Apni booking/payment | ✅ | ✅ | ✅ (sab, audit ke saath) |
| Doosre ka phone/email | ❌ | ❌ | Limited, kaaran ke saath |
| KYC documents | ❌ | Sirf apne upload kiye (dekhna band, status dikhta) | Sirf KYC Reviewer/Super Admin |
| Wallet/withdrawal | ❌ | ✅ | Finance (queue) |
| Listing banana | ❌ | ✅ (approved ho to) | Moderate/close kar sakta |
| Commission/rates badalna | ❌ | ❌ | Finance/Super Admin |
| Settings aur Roles | ❌ | ❌ | Super Admin |

---

## 6. Ek booking ki poori kahani (samay ke saath)

Maan lo Riya (Partner) aur Aman (Seeker), shehar Indore, category Movie.

| Samay | Kya hota hai | Stage |
|---|---|---|
| **Somvar 10:00** | Riya (approved, live) "Create Booking": Movie, Shanivar 6 PM, 3 ghante, PVR (public jagah), price Rs 4,500. Publish. | Listing: **Open** |
| **Somvar 11:30** | Aman Movie category me filters lagata hai (Indore, umar, Hindi), Riya ki listing dekhta hai, photos aur details padhta hai, **Send Request** dabata hai. | **Requested** (amber) |
| **Somvar 11:30** | Riya ko push + notification "New request". | |
| **Somvar 13:00** | Riya request kholti hai, Aman ki details dekhti hai, **Accept** dabati hai. Listing **Held**. Baaki requests auto-decline. Aman ko notification. | **Accepted** (blue) |
| **Somvar 13:05** | Aman notification kholta hai, **Confirm booking** dabata hai (30 minute ke andar). | **Payment pending** (purple) |
| **Somvar 13:10** | Aman payment page par "paisa surakshit hai" card padhta hai, Rs 4,500 + GST pay karta hai. Paisa **escrow me hold**. Address Aman aur Riya dono ko khulta hai. Listing **Booked**. | **Paid** (teal) |
| **Shukravar 18:00, Shanivar 16:00 aur 17:30** | Dono ko reminders (24 ghante, 2 ghante aur 30 minute pehle). Beech me chat chal sakti hai. | Paid |
| **Shanivar 18:00** | Meeting ka samay shuru. | **In progress** (orange) |
| **Shanivar 18:30** | Safety check-in "Are you okay?" dono ko. | |
| **Shanivar 21:05** | Meeting khatam. Aman booking me jaakar **Mark as Completed** dabata hai. OTP **4821** uski screen par aata hai. | **Awaiting OTP** (pink) |
| **Shanivar 21:07** | Aman Riya ko OTP bolta hai. Riya app me daalti hai. | |
| **Shanivar 21:07** | Server verify karta hai. Commission (jaise 15% = Rs 675) + uspar GST kata, baaki **net** Riya ke wallet me **pending se available (hold-days ke baad)** me jata hai. Popup: "Payment released". | **Completed** (green) |
| **Shanivar 21:10** | Aman rating + review deta hai. Dono ko invoice/receipt. | Completed |
| **Agle din** | Riya **Withdraw** request karti hai. Admin (ya auto) approve karta hai. Bank me paisa aata hai. Withdrawal **Paid**. | |

**Agar Aman OTP na de:** Riya "Service delivered" dabati hai → 24 ghante me Aman dispute nahi karta to **auto-release**; dispute kare to admin faisla karta hai.

---

## 7. Aksar bhula diya jane wale chhote features (checklist)

**Sabhi ke liye:** offline banner, update popup, skeleton loaders, har khali screen par madad karne wala message, pull-to-refresh, IST time, countdown timers, notification settings (offers default band), logged-in devices + logout all, session-expired popup, rate-limit ke friendly message, install app + iPhone guide, app version + check for updates, dark/light ke liye safe colors.

**Seeker:** saved partners, "Notify me", recently viewed, add to calendar, trusted contact share link, SOS, report/block, booking ID copy, invoice download, review, dispute window, data export, account delete, filters ka URL me yaad rehna.

**Partner:** health ring + next best actions, autosave aur resume, earning calculator, listing duplicate, calendar view, pause mode, reliability score, payout cooling period, KYC retention (documents ka delete), masked bank/UPI, "preview as seeker", reviews received.

**Admin:** audit log (kabhi edit nahi hota), 2FA + idle timeout, SLA timers, effective-dated commission, live calculator, bulk limits (KYC me bulk approve band), freeze withdrawals, SOS live queue, reconciliation, data-request deadline timer, system health, rollback of policy pages, consent report (kisne kaunsa version accept kiya).

---

## 8. Ek line me teeno panel

- **Seeker:** dhundho → request → confirm → pay (paisa surakshit) → milo → OTP do → review.
- **Partner:** profile + KYC + approval → listing banao → request accept → milo → OTP daalo → paisa wallet me → withdraw.
- **Admin:** approve karo, rules/charges tay karo, safety aur disputes dekho, paisa aur payout control karo, har kaam ka record rakho.
