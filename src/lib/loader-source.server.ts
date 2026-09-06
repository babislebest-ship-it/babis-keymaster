export type LoaderOptions = {
  runUrl: string;
  heartbeatUrl: string;
  appealUrl: string;
  cacheFile: string;
  /** Show the license key box in the in-game panel. */
  showKeyBox: boolean;
  /** Launch on open even when no cached key exists (used by the universal hub loader). */
  alwaysAutoLaunch: boolean;
  /** First line shown in the panel while the request is in flight. */
  initialStatus?: string;
};

/**
 * Builds the in-game Luau loader. Shared by the per-script loader and the
 * universal hub loader, which only differ by target URL and key-box presence.
 */
export function buildLoaderSource(options: LoaderOptions): string {
  const { runUrl, heartbeatUrl, appealUrl, cacheFile, showKeyBox, alwaysAutoLaunch } = options;
  const initialStatus = options.initialStatus ?? "Checking access...";

  const keyBoxBlock = showKeyBox
    ? `local keyBox = Instance.new("TextBox")
keyBox.Name = "LicenseKey"
keyBox.Size = UDim2.new(1, 0, 0, 42)
keyBox.BackgroundColor3 = Color3.fromRGB(15, 17, 14)
keyBox.BorderSizePixel = 0
keyBox.ClearTextOnFocus = false
keyBox.PlaceholderText = "Enter license key"
keyBox.Text = readCachedKey()
keyBox.TextColor3 = Color3.fromRGB(245, 245, 238)
keyBox.PlaceholderColor3 = Color3.fromRGB(132, 134, 126)
keyBox.Font = Enum.Font.Gotham
keyBox.TextSize = 14
keyBox.Parent = panel
local keyPadding = Instance.new("UIPadding")
keyPadding.PaddingLeft = UDim.new(0, 12)
keyPadding.PaddingRight = UDim.new(0, 12)
keyPadding.Parent = keyBox`
    : `local keyBox = { Text = "" }`;

  const panelHeight = showKeyBox ? 248 : 200;
  const buttonText = showKeyBox ? "Verify and launch" : "Launch";
  const autoLaunch =
    alwaysAutoLaunch || !showKeyBox
      ? `task.delay(0.2, launch)`
      : `if keyBox.Text and #keyBox.Text > 0 then task.delay(0.2, launch) end`;

  return `-- Babis Premium secure runtime loader
-- Use only inside Roblox experiences you own or are authorized to manage.
local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local player = Players.LocalPlayer
local RUN_URL = "${runUrl}"
local HEARTBEAT_URL = "${heartbeatUrl}"
local APPEAL_URL = "${appealUrl}"
local CACHE_FILE = "${cacheFile}"

local function safeRequest(url, method, body)
    local payload = body and HttpService:JSONEncode(body) or "{}"
    local headers = { ["Content-Type"] = "application/json" }
    local requestFn = (syn and syn.request) or (http and http.request) or request or http_request
    if requestFn then
        local ok, response = pcall(requestFn, { Url = url, Method = method or "POST", Headers = headers, Body = payload })
        if not ok or not response then return false, "Request failed" end
        local status = tonumber(response.StatusCode or response.status_code or response.Status or 0) or 0
        local text = tostring(response.Body or response.body or "")
        return status >= 200 and status < 300, text, status
    end
    if game.HttpPost then
        local ok, text = pcall(function() return game:HttpPost(url, payload, "application/json") end)
        if ok then return true, text, 200 end
    end
    return false, "No compatible HTTP request function is available", 0
end

local function decode(text)
    local ok, data = pcall(function() return HttpService:JSONDecode(text) end)
    if ok and type(data) == "table" then return data end
    return { ok = false, message = "Invalid server response" }
end

local function readCachedKey()
    if isfile and readfile then
        local ok, value = pcall(function() if isfile(CACHE_FILE) then return readfile(CACHE_FILE) end end)
        if ok and type(value) == "string" then return value end
    end
    return ""
end

local function saveCachedKey(value)
    if writefile and type(value) == "string" and #value > 0 then
        pcall(function() writefile(CACHE_FILE, value) end)
    end
end

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BabisPremiumLoader"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
if syn and syn.protect_gui then pcall(function() syn.protect_gui(screenGui) end) end
screenGui.Parent = (gethui and gethui()) or game:GetService("CoreGui")

local shade = Instance.new("Frame")
shade.Name = "Shade"
shade.BackgroundColor3 = Color3.fromRGB(10, 12, 10)
shade.BackgroundTransparency = 0.18
shade.Size = UDim2.new(1, 0, 1, 0)
shade.Parent = screenGui

local panel = Instance.new("Frame")
panel.Name = "Panel"
panel.AnchorPoint = Vector2.new(0.5, 0.5)
panel.Position = UDim2.new(0.5, 0, 0.5, 0)
panel.Size = UDim2.new(0.86, 0, 0, ${panelHeight})
panel.BackgroundColor3 = Color3.fromRGB(25, 27, 23)
panel.BorderSizePixel = 0
panel.Parent = shade

local sizeLimit = Instance.new("UISizeConstraint")
sizeLimit.MinSize = Vector2.new(280, ${panelHeight - 28})
sizeLimit.MaxSize = Vector2.new(440, ${panelHeight + 32})
sizeLimit.Parent = panel

local stroke = Instance.new("UIStroke")
stroke.Color = Color3.fromRGB(218, 178, 86)
stroke.Thickness = 1
stroke.Transparency = 0.18
stroke.Parent = panel

local padding = Instance.new("UIPadding")
padding.PaddingTop = UDim.new(0, 18)
padding.PaddingBottom = UDim.new(0, 18)
padding.PaddingLeft = UDim.new(0, 18)
padding.PaddingRight = UDim.new(0, 18)
padding.Parent = panel

local layout = Instance.new("UIListLayout")
layout.FillDirection = Enum.FillDirection.Vertical
layout.HorizontalAlignment = Enum.HorizontalAlignment.Center
layout.VerticalAlignment = Enum.VerticalAlignment.Top
layout.Padding = UDim.new(0, 12)
layout.SortOrder = Enum.SortOrder.LayoutOrder
layout.Parent = panel

local title = Instance.new("TextLabel")
title.Name = "Title"
title.BackgroundTransparency = 1
title.Size = UDim2.new(1, 0, 0, 28)
title.Font = Enum.Font.GothamBold
title.Text = "Babis Premium"
title.TextColor3 = Color3.fromRGB(246, 225, 173)
title.TextScaled = true
title.Parent = panel

local status = Instance.new("TextLabel")
status.Name = "Status"
status.BackgroundTransparency = 1
status.Size = UDim2.new(1, 0, 0, 40)
status.Font = Enum.Font.Gotham
status.Text = "${initialStatus}"
status.TextColor3 = Color3.fromRGB(216, 218, 208)
status.TextWrapped = true
status.TextSize = 14
status.Parent = panel

${keyBoxBlock}

local button = Instance.new("TextButton")
button.Name = "Verify"
button.Size = UDim2.new(1, 0, 0, 42)
button.BackgroundColor3 = Color3.fromRGB(218, 178, 86)
button.BorderSizePixel = 0
button.Font = Enum.Font.GothamBold
button.Text = "${buttonText}"
button.TextColor3 = Color3.fromRGB(18, 16, 10)
button.TextSize = 14
button.Parent = panel

local sessionToken = nil
local launched = false
local function closeGui()
    local fadeInfo = TweenInfo.new(0.18, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
    pcall(function() TweenService:Create(panel, fadeInfo, { Position = UDim2.new(0.5, 0, 0.48, 0), BackgroundTransparency = 1 }):Play() end)
    pcall(function() TweenService:Create(shade, fadeInfo, { BackgroundTransparency = 1 }):Play() end)
    task.delay(0.22, function() pcall(function() screenGui:Destroy() end) end)
end

local function launch()
    if launched then return end
    launched = true
    button.Active = false
    button.Text = "Launching..."
    status.Text = "Verifying access..."
    local body = {
        licenseKey = keyBox.Text or "",
        playerUserId = player and tostring(player.UserId) or "",
        playerName = player and player.Name or "",
        placeId = tostring(game.PlaceId),
        universeId = tostring(game.GameId),
        jobId = tostring(game.JobId),
        executorName = identifyexecutor and tostring(identifyexecutor()) or "Roblox"
    }
    local ok, text, httpStatus = safeRequest(RUN_URL, "POST", body)
    local response = decode(text or "")
    if not ok or not response.ok then
        launched = false
        button.Active = true
        button.Text = "${buttonText}"
        status.Text = tostring((response and response.message) or ("HTTP " .. tostring(httpStatus)))
        if httpStatus == 401 or httpStatus == 403 then status.Text = status.Text .. " | Appeal: " .. APPEAL_URL end
        return
    end
    sessionToken = response.sessionToken
    if keyBox.Text and #keyBox.Text > 0 then saveCachedKey(keyBox.Text) end
    status.Text = "Access granted. Starting " .. tostring(response.scriptName or "script") .. "..."
    closeGui()
    task.spawn(function()
        local StarterGui = game:GetService("StarterGui")
        while sessionToken do
            task.wait(10)
            local heartbeatOk, heartbeatText = safeRequest(HEARTBEAT_URL, "POST", { sessionToken = sessionToken })
            local heartbeat = decode(heartbeatText or "")
            if heartbeatOk and heartbeat and heartbeat.action == "kick" then
                local reason = tostring(heartbeat.reason or "Access revoked") .. " | Appeal: " .. APPEAL_URL
                pcall(function() if player then player:Kick(reason) end end)
                break
            end
            if heartbeatOk and heartbeat and heartbeat.message and #tostring(heartbeat.message) > 0 then
                pcall(function() StarterGui:SetCore("SendNotification", { Title = "Babis Premium", Text = tostring(heartbeat.message), Duration = 8 }) end)
            end
        end
    end)
    pcall(function() if player then player.AncestryChanged:Connect(function(_, parent) if not parent then sessionToken = nil end end) end end)
    local compile = loadstring or load
    if type(compile) ~= "function" then
        status.Text = "This runtime does not support dynamic Luau execution."
        return
    end
    local fn, compileError = compile(tostring(response.source or ""))
    if type(fn) ~= "function" then
        warn("Babis compile error: " .. tostring(compileError))
        return
    end
    local runOk, runError = pcall(fn)
    if not runOk then warn("Babis runtime error: " .. tostring(runError)) end
end

button.MouseButton1Click:Connect(launch)
${autoLaunch}
`;
}

const BROWSERISH = /Mozilla|Chrome|Safari|Firefox|Edg\/|curl|wget|python|Go-http/i;
const ROBLOXISH =
  /Roblox|HttpGet|WinInet|Synapse|Script-Ware|KRNL|Fluxus|Hydrogen|Delta|Arceus|Xeno|Wave|Solara|Swift|Celery|AWP|Valyse|Zorara|Luau/i;

/** Only Roblox clients / executors may read the raw loader source. */
export function isBlockedLoaderClient(userAgent: string): boolean {
  const isRoblox = ROBLOXISH.test(userAgent);
  return !isRoblox && BROWSERISH.test(userAgent);
}

/** Reads the configurable Discord appeal link, with a safe fallback. */
export async function getAppealUrl(): Promise<string> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("app_settings")
      .select("discord_invite_url")
      .eq("id", "global")
      .maybeSingle();
    if (data?.discord_invite_url) return String(data.discord_invite_url);
  } catch {}
  return "https://discord.gg/75auNNfmhS";
}
