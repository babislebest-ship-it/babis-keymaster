# Script Sentinel

## Mobile shop and native builds

The storefront at `/` includes product details, a persistent cart and local order history, a responsive bottom navigation bar, and dark/light themes. It uses sample products when the database has no published shop items. Sandbox PayPal checkout is optional: set `VITE_PAYPAL_CLIENT_ID` to a PayPal **sandbox** client ID (see `.env.example`). No PayPal secret belongs in a `VITE_*` variable or in the client. Sandbox orders are captured in the browser and saved only on the current device; they do not create server orders or deliver licenses. Production checkout is intentionally disabled in this flow. Before accepting real payments, implement server-side order creation/capture, authoritative price validation, and fulfillment.

Install Node.js, npm, the Android SDK (including platform-tools/build-tools), and a JDK compatible with the generated Capacitor Android project. iOS builds require macOS and Xcode.

```sh
npm install
npm run build
npx cap add android
npx cap sync android
```

On Windows, build a debug APK from the repository root after sync:

```powershell
Set-Location android
.\gradlew.bat assembleDebug
```

The APK is written to `android\app\build\outputs\apk\debug\app-debug.apk`. The Capacitor iOS project is under `ios\App\App.xcodeproj`; open it with Xcode on macOS or run `npx cap open ios`. Re-run `npm run build` and `npx cap sync` after web changes. Android's system back button is wired to browser history (or exits at the root), and Capacitor's splash screen is configured in `capacitor.config.ts`.

Capacitor uses the TanStack Start public build output in `.output/public`; verify that the build emits `index.html` there before native sync. The current application also relies on hosted server routes and Supabase, so native builds must be tested against the configured backend before release.

The native wrapper loads the hosted application URL because TanStack Start server routes are required for sign-in and dashboard features. `capacitor.config.ts` defaults to the Lovable deployment; set `CAPACITOR_SERVER_URL` to your HTTPS deployment origin before `npx cap sync` when building another environment. This wrapper needs network access and is not an offline/static app.

## Build an iOS IPA in the cloud

This repository includes two on-demand workflows in `codemagic.yaml` for Codemagic's macOS build machines. Capacitor iOS builds require macOS and Xcode; this Windows worktree cannot build an iOS app locally. Both workflows run `npm ci`, build the web app, sync the Capacitor iOS project, and use Node.js 22 and Xcode 26.

### Unsigned IPA (no paid Apple Developer account)

The `iOS unsigned IPA (no paid developer account)` workflow archives the app with code signing disabled and packages the `.app` into `build/ios/babis.ipa`. This is an unsigned package for experimentation—not an installable, App Store, or TestFlight-ready IPA. It cannot be installed on an iPhone as-is, and Codemagic cannot turn it into a distributable app without signing.

For personal-device testing without a paid membership, use a Mac with Xcode and sign the app using an Apple ID's free Personal Team, then install it with Xcode or a compatible sideloading tool such as AltStore/SideStore. Free provisioning is intended for personal testing, expires quickly (commonly after seven days), and has device/app limits; the app must be re-signed periodically. Availability and limits are controlled by Apple and may change. This is separate from the unsigned Codemagic workflow, which does not request or store Apple credentials.

For App Store, TestFlight, or normal managed distribution, use the signed workflow below; those routes require Apple Developer Program membership and valid signing assets.

Before a cloud build:

1. Commit and push this branch, including `ios/`, `codemagic.yaml`, and the lockfile. Codemagic reads configuration from the connected Git repository; uncommitted local files are not available to its build machines.
2. In Codemagic, add/connect this GitHub repository and select the `iOS IPA (Codemagic)` workflow. Configure the iOS code-signing identity for bundle ID `com.babis.keymaster`. The workflow targets App Store/TestFlight distribution, so use a matching Apple Distribution certificate and App Store provisioning profile. You can upload those signing files to Codemagic or let it manage/fetch them through the Apple Developer Portal integration.
3. App Store signing requires an Apple Developer team and the registered app identifier. If using Codemagic's automatic certificate/profile management or App Store Connect publishing, create an App Store Connect API key with suitable App Manager access and add it in Codemagic's Team integrations. An API key is not needed for a build when you manually upload the matching signing certificate and profile. Create an App Store Connect app record before TestFlight/App Store submission.
4. Start the `iOS IPA (Codemagic)` workflow manually. Download the `.ipa` artifact from the completed build; upload it to TestFlight/App Store Connect or distribute it to devices using the matching signing method.

Never commit Apple API `.p8` keys, distribution certificates/private keys, provisioning profiles, or their passwords. Store/manage signing assets only in Codemagic's code-signing integrations. An IPA is not generated by the local `cap sync`; the signed workflow produces it from an Xcode archive/export on the macOS runner. The workflow does not automatically publish the app. The unsigned workflow needs no signing credentials but its IPA is only a package for further signing/testing workflows, not a directly installable deliverable.

The iOS wrapper currently points to the HTTPS URL set by `CAPACITOR_SERVER_URL` (default: the Lovable site), because authentication and dashboard features depend on hosted server routes. Confirm that this backend is the intended production environment and reachable before releasing the IPA.

References: [Capacitor iOS requirements](https://capacitorjs.com/docs/getting-started/environment-setup#ios-requirements), [Capacitor iOS workflow](https://capacitorjs.com/docs/ios), [Codemagic native iOS builds and signing](https://docs.codemagic.io/yaml-quick-start/building-a-native-ios-app/), and [Codemagic YAML configuration](https://docs.codemagic.io/yaml-basic-configuration/yaml-getting-started/).

MaximumSize is not a valid member of Frame

En gros là frérot je veut faire un truc je mets un script luau pour Roblox en gros le script sécurisé pour que personne ne puisse voir le script en question seulement par exemple un executor ou quoi peut avoir accès et exécuter le script ok en anglais le site go en gros le site sauvegarde les script paste en gros déjà tu te connecte en admin pseudo Babis mot de passe Lmad2010 il retien la connexion il te dis crée un nouveau script quand tu click tu mets un script en luau et en gros le script sauvegarde et le limite au executor l’executor peut lire ok ensuite le site de donne le loadstringgame:// inaccessible pour les gens normal pour exécuteur ok en gros l’exécuteur a l’accès directe au script ensuite un utilisateur normal du genre un normal genre un mec normal luis il a une page ou il doit se connecté compte utilisateur Babis mot de passe Lmad2010 sécurise le site retiens la connexion ensuite tout les script enregistré et te donne un loadstring ok en anglais gooNan en gros quand je me connecte je peut crée un script le mettre dedans aucune personne n’a accès au script sauf l’exécuteur aussi je veut que sa s’appelle Babis pour se connecte goo en anglais goo HTTP 403

Stack Begin

Script 'LocalScript', Line 1

Stack End This error on the executor Same error Fais attention à l’erreur http 403 renseigne toi sur les executor en anglais goJ’arrive pas à copy fix this in english goHTTP 401 error Line 1 fix this broMaintenant je veut faire un truc pour les script une option pour ajouter des gens qui peuvent utiliser script en mode fais liscense key le script génère la liscense et a accès au script le joueur peut en crée la révoqué ect genre add liscense key peut voir qui utilise bloque la liscense key aussi utilisateur qui utilise la liscense key quand il mets la liscense key une fois le script lance et bah la liscense key se sauvegarde dans delta ou dans exécutor et il a plus besoin de taper la liscense key sauf si révoque ou ban en anglais go En gros déjà je veut un gui dans le script en gros le gui il se lance toujours même si le script ne marche pas s’adapte à la taille de l’écran connecté a la base de donnée des liscense key quand la liscense key et correcte lance le script d’origine ( seulement quand option et active ) aussi je veut surtout un truc avancé un beau gui adapté pour tout les taille de l’écran il doit contour arrondi un text box pour mettre la liscense key un truc avec Babis Premium et la key ok en anglais fix tout les copy button il march pas tout quand je click sa marche pas sa copy pas tout verify que tout les bouton marche bien aussi je peut pas accède au script d’origine genre quand j’ai save je peut pas modifié le script adapte le site pour les mobile aussi pc tout en anglais fix tout go Problème aussi le gui je veut trois tiret où y a tout les name des script et tu peut les édit liscense key ect aussi je veut que tu fix login fiâmes aussi je veut que le site sauvegarde le mec qui c’est connecter en anglais go fixed version goOk déjà je veut le loader intégrée au source code comme sa l’utilisateur qui utilise le scirpt ne saura pas la key ensuite je veut que tu crée un autre truc en gros la liste des liscense key quand le lancement panel pour verify la key récupère la liste sécurisé et uniquement accessible par lui et voilà en anglais fix this bro in english Je veut que les script soit sauvegardé aussi go en anglais surtout je veut que le script final que le script donne soit loadstring game :( oublie pas même si ya liscense key ou pas je veut sa en anglais go fais gaffe a nil value dans executor http401 les erreur de loading ect go en anglais de login ect regarde tout les erreur et go en anglais go utilise tout les credit possible ok le truc le plus bien possible go en anglais commence tout d’un coup go en anglais fully Souvent j’ai fais plusieurs site exactement avec le même prompt même erreur plusieurs fois go en anglais :1: attempt to call a nil

value

Stack Begin

Script 'LocalScript', Line 1

Stack End Souvent 98% aller in english go Error 401 aussi des notifications de copy genre je veut que tout des button valide que le bouton a bien était actionné en anglais go go liscense key je veut la copier quand je veut goHTTP 401

Stack Begin

Script 'LocalScript', Line 1

Stack End

CLEAR and fix nil value"Frame"

Stack Begin

Script 'LocalScript', Line 25

Script 'LocalScript', Line 1

Stack End Fix tout les erreur dans le code que tu voit en anglais go Ensuite garde bien le gui une fois que loader a fini de se lancer et bah il s’enlève avec animation je veut pas que les texte soit coller au bouton ok en anglais fix go en anglaisOk 2 problème le gui loader a des problème ensuite je veut que tout soit carré dans le loader ensuite le site adapte au mobile tablette ect meilleur sécurité corrige tout les erreur aussi le owner peut ban les gens qui utilise le script même sens loader ensuite le owner peut ajouter des compte pour crée des licence enregistrer des script il peut gérer les permissions le owner = Babis ok en anglais fixOk 2 problème le gui loader a des problème ensuite je veut que tout soit carré dans le loader ensuite le site adapte au mobile tablette ect meilleur sécurité corrige tout les erreur aussi le owner peut ban les gens qui utilise le script même sens loader ensuite le owner peut ajouter des compte pour crée des licence enregistrer des script il peut gérer les permissions le owner = Babis ok en anglais fix Et aussi le loader quand la liscense correcte le gui disparaît avec une animation ok en anglais go fully scriptStretch is not a valid member of

"Enum.HorizontalAlignment"

Stack Begin

Script 'LocalScript, Line 123

Script 'LocalScript', Line 1

Stack End

CLEARwork purfectly add now temporaire liscense genre 15 minute une heure 1 jours bref le temps et gerable fix all the error how better animations quand la liscense key et validé aussi je veut que le gui du liscense key s’enlève plus vite avec animation plus clean aussi le ban les gens qui utilise le script sans liscense le script même comme sa il récupère les info pour pouvoir le ban aussi les logs voilà aussi ont peut voir utilisations actuelle des differents script donc actuel trier par les script tu crée sa un onglet Player avec un truc ou tu peut trier les players online les ban pendant qu’il joue je veut un ban ip si possible ensuite je veut que le ban kick le joueur lui mets une notification et sa le relance le jeux ok ensuite quand il y se fais ban le discord et copier for appeal here https://discord.gg/tRA3yStbvq et voilà en anglais go fix all go aussi le site web quand je save ne d’Adapte plus pour les mobile sa doit être un bug fix go en anglais go Fais gaffe des fois quand je lance le loadstring sa fais attempt to call a nil value ok en gros je veut que déjà personne et accès au script qui sont lu dans le loader même si c’est require liscense ou sans liscense pareille pour les ban le live onglet tu choisis un script actuellement ensuite tu peut voir le nombre de personne qui l’utilise tu peut voir le heure de jeux ip si possible leur nom de player ok ensuite dans ban sa permet de ban les joueur qui utilise les script en les kickant du jeux et sa copie automatiquement le discord for appeal donc quand il sont ban il peuvent plus lancé de script Babis tant que un membre du support n’en n’a pas décider ok en anglais le ban marche même sur les script sans liscense ok en anglais goo fix all fais gaffe a nil value ok en anglais go fixAussi le code source du loader et le code source du script et accessible depuis le loader fix this in english alors frérot déjà je veut que se soit le loader , code source du script original je veut que se soit accessible juste par executor même pas un utiiisateur a accès ok ensuite le loader quand il dans lisence key il doit disparaître n’oublie rajoute aussi un onglet historique account pour pouvoir les ban ou les kick meme si il sont pas en ligne en gros le script a 3 option ban le joueur de se script ou de tout les script une option with ban ip pour évité que le joueur revient avec un autre compte kick avec la raison permet de kick le player en live en direct avec la raison puis sa fais copier le discord automatiquement ok en anglais tout doit être carré sans erreur go in english

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://babis-keymaster.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/22a853b6-818e-4bb2-af41-94d2f6c5d270).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
