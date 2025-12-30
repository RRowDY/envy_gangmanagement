local QBCore = exports['qb-core']:GetCoreObject()
RegisterNetEvent('QBCore:Client:UpdateObject', function() QBCore = exports['qb-core']:GetCoreObject() end)

-- NUI State
local isMenuOpen = false

-- Functions
local function OpenGangMenu()
    if isMenuOpen then return end
    
    -- Check if player is staff, if player is gang leader, and if player is in a gang
    QBCore.Functions.TriggerCallback('envy_gangscript:isStaff', function(isStaff)
        QBCore.Functions.TriggerCallback('envy_gangscript:isGangLeader', function(isGangLeader)
            QBCore.Functions.TriggerCallback('envy_gangscript:getPlayerGang', function(gangData)
                local inGang = gangData ~= nil
                
                -- Get player permissions
                QBCore.Functions.TriggerCallback('envy_gangscript:getPlayerPermissions', function(permData)
                    isMenuOpen = true
                    SetNuiFocus(true, true)
                    
                    SendNUIMessage({
                        action = 'openMenu',
                        data = {
                            logoImage = Config.LogoImage,
                            isStaff = isStaff,
                            isGangLeader = isGangLeader,
                            inGang = inGang,
                            permissions = permData.permissions or {},
                            playerLevel = permData.playerLevel or 0
                        }
                    })
                end)
            end)
        end)
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

RegisterNUICallback('getOnlinePlayersForInvite', function(data, cb)
    QBCore.Functions.TriggerCallback('envy_gangscript:getOnlinePlayersForInvite', function(players)
        cb(players)
    end)
end)

RegisterNUICallback('invitePlayer', function(data, cb)
    local targetCitizenid = data.targetCitizenid
    
    if not targetCitizenid then
        cb({ success = false, message = 'Missing target player' })
        return
    end
    
    QBCore.Functions.TriggerCallback('envy_gangscript:invitePlayer', function(result)
        cb(result)
    end, targetCitizenid)
end)

RegisterNUICallback('acceptInvite', function(data, cb)
    local inviteId = data.inviteId
    
    if not inviteId then
        cb({ success = false, message = 'Missing invite ID' })
        return
    end
    
    QBCore.Functions.TriggerCallback('envy_gangscript:acceptInvite', function(result)
        cb(result)
    end, inviteId)
end)

RegisterNUICallback('denyInvite', function(data, cb)
    local inviteId = data.inviteId
    
    if not inviteId then
        cb({ success = false, message = 'Missing invite ID' })
        return
    end
    
    QBCore.Functions.TriggerCallback('envy_gangscript:denyInvite', function(result)
        cb(result)
    end, inviteId)
end)

-- Variable to track if invite notification is active
local inviteNotificationActive = false

-- Register key mappings for invite acceptance/denial
RegisterKeyMapping('gang_invite_accept', 'Accept Gang Invite', 'keyboard', 'G')
RegisterKeyMapping('gang_invite_deny', 'Deny Gang Invite', 'keyboard', 'J')

RegisterCommand('gang_invite_accept', function()
    if inviteNotificationActive then
        SendNUIMessage({
            action = 'inviteKeyPress',
            key = 'accept'
        })
        inviteNotificationActive = false
    end
end, false)

RegisterCommand('gang_invite_deny', function()
    if inviteNotificationActive then
        SendNUIMessage({
            action = 'inviteKeyPress',
            key = 'deny'
        })
        inviteNotificationActive = false
    end
end, false)

-- Show notification event (for inviter notifications)
RegisterNetEvent('envy_gangscript:showNotification', function(message, type, title)
    SendNUIMessage({
        action = 'showNotification',
        data = {
            message = message,
            type = type or 'info',
            title = title
        }
    })
end)

RegisterNUICallback('getGangRoster', function(data, cb)
    QBCore.Functions.TriggerCallback('envy_gangscript:getGangRoster', function(result)
        cb(result)
    end)
end)

RegisterNUICallback('leaveGang', function(data, cb)
    QBCore.Functions.TriggerCallback('envy_gangscript:leaveGang', function(result)
        cb(result)
    end)
end)

RegisterNUICallback('kickPlayer', function(data, cb)
    local targetCitizenid = data.targetCitizenid
    if not targetCitizenid then
        cb({ success = false, message = 'Missing target citizen ID' })
        return
    end
    
    QBCore.Functions.TriggerCallback('envy_gangscript:kickPlayer', function(result)
        cb(result)
    end, targetCitizenid)
end)

RegisterNUICallback('getPlayerGang', function(data, cb)
    QBCore.Functions.TriggerCallback('envy_gangscript:getPlayerGang', function(result)
        cb(result)
    end)
end)

RegisterNUICallback('getGangRanks', function(data, cb)
    QBCore.Functions.TriggerCallback('envy_gangscript:getGangRanks', function(result)
        cb(result)
    end)
end)

RegisterNUICallback('addRank', function(data, cb)
    local rankName = data.rankName
    if not rankName then
        cb({ success = false, message = 'Missing rank name' })
        return
    end
    
    QBCore.Functions.TriggerCallback('envy_gangscript:addRank', function(result)
        cb(result)
    end, rankName)
end)

RegisterNUICallback('deleteRank', function(data, cb)
    local rankName = data.rankName
    if not rankName then
        cb({ success = false, message = 'Missing rank name' })
        return
    end
    
    QBCore.Functions.TriggerCallback('envy_gangscript:deleteRank', function(result)
        cb(result)
    end, rankName)
end)

RegisterNUICallback('reorderRanks', function(data, cb)
    local orderedRankNames = data.orderedRankNames
    if not orderedRankNames then
        cb({ success = false, message = 'Missing rank order' })
        return
    end
    
    QBCore.Functions.TriggerCallback('envy_gangscript:reorderRanks', function(result)
        cb(result)
    end, orderedRankNames)
end)

RegisterNUICallback('updateRankPermission', function(data, cb)
    local rankName = data.rankName
    local permission = data.permission
    local enabled = data.enabled
    
    if not rankName or not permission or enabled == nil then
        cb({ success = false, message = 'Missing required data' })
        return
    end
    
    QBCore.Functions.TriggerCallback('envy_gangscript:updateRankPermission', function(result)
        cb(result)
    end, rankName, permission, enabled)
end)

RegisterNUICallback('updateRankPermissions', function(data, cb)
    local rankName = data.rankName
    local permissions = data.permissions
    
    if not rankName or not permissions then
        cb({ success = false, message = 'Missing required data' })
        return
    end
    
    QBCore.Functions.TriggerCallback('envy_gangscript:updateRankPermissions', function(result)
        cb(result)
    end, rankName, permissions)
end)

RegisterNUICallback('editPlayerRank', function(data, cb)
    local citizenid = data.citizenid
    local rankName = data.rankName
    
    if not citizenid or not rankName then
        cb({ success = false, message = 'Missing required data' })
        return
    end
    
    QBCore.Functions.TriggerCallback('envy_gangscript:editPlayerRank', function(result)
        cb(result)
    end, citizenid, rankName)
end)

-- Receive invite event
RegisterNetEvent('envy_gangscript:receiveInvite', function(inviteData)
    SendNUIMessage({
        action = 'receiveInvite',
        data = inviteData
    })
    
    -- Enable key handlers for invite notification
    inviteNotificationActive = true
    
    -- Auto-disable after 30 seconds
    CreateThread(function()
        Wait(30000)
        if inviteNotificationActive then
            inviteNotificationActive = false
        end
    end)
end)

-- NUI Callback to stop listening for keys when notification is closed
RegisterNUICallback('inviteNotificationClosed', function(data, cb)
    inviteNotificationActive = false
    cb('ok')
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

