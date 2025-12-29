local QBCore = exports['qb-core']:GetCoreObject()
RegisterNetEvent('QBCore:Client:UpdateObject', function() QBCore = exports['qb-core']:GetCoreObject() end)

-- NUI State
local isMenuOpen = false

-- Functions
local function OpenGangMenu()
    if isMenuOpen then return end
    
    -- Check if player is staff
    QBCore.Functions.TriggerCallback('envy_gangscript:isStaff', function(isStaff)
        isMenuOpen = true
        SetNuiFocus(true, true)
        
        SendNUIMessage({
            action = 'openMenu',
            data = {
                logoImage = Config.LogoImage,
                isStaff = isStaff
            }
        })
    end)
end

local function CloseGangMenu()
    if not isMenuOpen then return end
    
    isMenuOpen = false
    SetNuiFocus(false, false)
    
    SendNUIMessage({
        action = 'closeMenu'
    })
end

-- Keybind Registration
RegisterKeyMapping('gangmenu', Config.KeybindDescription, 'keyboard', Config.DefaultKey)

-- Command Handler
RegisterCommand('gangmenu', function()
    if isMenuOpen then
        CloseGangMenu()
    else
        OpenGangMenu()
    end
end, false)

-- NUI Callbacks
RegisterNUICallback('closeMenu', function(data, cb)
    CloseGangMenu()
    cb('ok')
end)

RegisterNUICallback('getAllPlayers', function(data, cb)
    QBCore.Functions.TriggerCallback('envy_gangscript:getAllPlayers', function(players)
        cb(players)
    end)
end)

RegisterNUICallback('createGang', function(data, cb)
    local gangName = data.gangName
    local ownerCitizenid = data.ownerCitizenid
    local gangColor = data.gangColor or '#ffffff'
    
    if not gangName or not ownerCitizenid then
        cb({ success = false, message = 'Missing required fields' })
        return
    end
    
    QBCore.Functions.TriggerCallback('envy_gangscript:createGang', function(result)
        cb(result)
    end, gangName, ownerCitizenid, gangColor)
end)

RegisterNUICallback('getAllGangs', function(data, cb)
    QBCore.Functions.TriggerCallback('envy_gangscript:getAllGangs', function(gangs)
        cb(gangs)
    end)
end)

RegisterNUICallback('deleteGang', function(data, cb)
    local gangId = data.gangId
    
    if not gangId then
        cb({ success = false, message = 'Missing gang ID' })
        return
    end
    
    QBCore.Functions.TriggerCallback('envy_gangscript:deleteGang', function(result)
        cb(result)
    end, gangId)
end)

RegisterNUICallback('updateGang', function(data, cb)
    local gangId = data.gangId
    local gangName = data.gangName
    local ownerCitizenid = data.ownerCitizenid
    local gangColor = data.gangColor or '#ffffff'
    
    if not gangId or not gangName or not ownerCitizenid then
        cb({ success = false, message = 'Missing required fields' })
        return
    end
    
    QBCore.Functions.TriggerCallback('envy_gangscript:updateGang', function(result)
        cb(result)
    end, gangId, gangName, ownerCitizenid, gangColor)
end)

-- ESC Key Handler
CreateThread(function()
    while true do
        Wait(0)
        if isMenuOpen then
            if IsControlJustPressed(0, 194) then -- ESC Key
                CloseGangMenu()
            end
        else
            Wait(500)
        end
    end
end)

