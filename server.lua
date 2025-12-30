local QBCore = exports['qb-core']:GetCoreObject()

-- Database Setup
-- Wait for MySQL to be available (set by @oxmysql/lib/MySQL.lua)
CreateThread(function()
    -- Wait for oxmysql resource to start
    while GetResourceState('oxmysql') ~= 'started' do
        Wait(100)
    end
    
    -- Wait for MySQL to be set by MySQL.lua
    local attempts = 0
    while not MySQL do
        Wait(100)
        attempts = attempts + 1
        if attempts > 200 then -- 20 seconds
            print('[envy_gangscript] ERROR: MySQL not available. Check that @oxmysql/lib/MySQL.lua is loading correctly.')
            return
        end
    end
    
    -- Now use MySQL.ready
    local readyFunction = MySQL.ready
    if readyFunction ~= nil then
        MySQL.ready(function()
            MySQL.query([[
                CREATE TABLE IF NOT EXISTS `gangs` (
                    `id` int(11) NOT NULL AUTO_INCREMENT,
                    `name` varchar(32) NOT NULL,
                    `owner` varchar(50) NOT NULL,
                    `color` varchar(6) NOT NULL DEFAULT 'ffffff',
                    `gang_ranks` text DEFAULT NULL,
                    `gang_members` text DEFAULT NULL,
                    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
                    PRIMARY KEY (`id`),
                    UNIQUE KEY `name` (`name`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ]])
            
            -- Add color column if it doesn't exist (for existing tables)
            local colorColumnExists = MySQL.single.await([[
                SELECT COUNT(*) as count 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'gangs' 
                AND COLUMN_NAME = 'color'
            ]], {})
            
            if not colorColumnExists or colorColumnExists.count == 0 then
                MySQL.query([[
                    ALTER TABLE `gangs` 
                    ADD COLUMN `color` varchar(6) NOT NULL DEFAULT 'ffffff' 
                    AFTER `owner`;
                ]])
            end
            
            -- Add gang_ranks column if it doesn't exist
            local ranksColumnExists = MySQL.single.await([[
                SELECT COUNT(*) as count 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'gangs' 
                AND COLUMN_NAME = 'gang_ranks'
            ]], {})
            
            if not ranksColumnExists or ranksColumnExists.count == 0 then
                MySQL.query([[
                    ALTER TABLE `gangs` 
                    ADD COLUMN `gang_ranks` text DEFAULT NULL
                    AFTER `color`;
                ]])
            end
            
            -- Add gang_members column if it doesn't exist
            local membersColumnExists = MySQL.single.await([[
                SELECT COUNT(*) as count 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'gangs' 
                AND COLUMN_NAME = 'gang_members'
            ]], {})
            
            if not membersColumnExists or membersColumnExists.count == 0 then
                MySQL.query([[
                    ALTER TABLE `gangs` 
                    ADD COLUMN `gang_members` text DEFAULT NULL
                    AFTER `gang_ranks`;
                ]])
            end
        end)
    end
end)

-- Helper function to check if player is staff (admin or god)
local function IsStaff(source)
    return QBCore.Functions.HasPermission(source, 'admin') or QBCore.Functions.HasPermission(source, 'god')
end

-- Helper function to get character name from citizenid
local function GetCharacterName(citizenid)
    -- Try online players first
    for src, player in pairs(QBCore.Functions.GetQBPlayers()) do
        if player.PlayerData.citizenid == citizenid then
            local charinfo = player.PlayerData.charinfo
            return (charinfo.firstname or '') .. ' ' .. (charinfo.lastname or '')
        end
    end
    
    -- Try offline players
    local offlinePlayer = QBCore.Functions.GetOfflinePlayerByCitizenId(citizenid)
    if offlinePlayer and offlinePlayer.PlayerData and offlinePlayer.PlayerData.charinfo then
        local charinfo = offlinePlayer.PlayerData.charinfo
        return (charinfo.firstname or '') .. ' ' .. (charinfo.lastname or '')
    end
    
    return 'Unknown'
end

-- Helper function to get player's gang info (using gang_members)
local function GetPlayerGang(source)
    local Player = QBCore.Functions.GetPlayer(source)
    if not Player then return nil end
    
    if not MySQL then return nil end
    
    local citizenid = Player.PlayerData.citizenid
    
    -- Find which gang the player is in
    local gangs = MySQL.query.await('SELECT id, name, color, gang_members FROM gangs', {})
    if gangs then
        for _, gang in ipairs(gangs) do
            if gang.gang_members then
                local success, members = pcall(json.decode, gang.gang_members)
                if success and members and type(members) == 'table' then
                    if members[citizenid] then
                        return {
                            id = gang.id,
                            name = gang.name,
                            color = gang.color,
                            memberData = members[citizenid]
                        }
                    end
                end
            end
        end
    end
    
    return nil
end

-- Helper function to check if player is a gang leader
local function IsGangLeader(source)
    local Player = QBCore.Functions.GetPlayer(source)
    if not Player then return false end
    
    if not MySQL then return false end
    
    local citizenid = Player.PlayerData.citizenid
    
    -- Check gang_members in gangs table
    local gangs = MySQL.query.await('SELECT id, name, gang_members FROM gangs', {})
    if gangs then
        for _, gang in ipairs(gangs) do
            if gang.gang_members then
                local success, members = pcall(json.decode, gang.gang_members)
                if success and members and type(members) == 'table' then
                    local memberData = members[citizenid]
                    if memberData and memberData.rank == 'boss' and memberData.level == 10 then
                        return true
                    end
                end
            end
        end
    end
    
    return false
end

-- Helper function to check if player is in a gang (using gang_members)
local function IsPlayerInGang(citizenid)
    if not MySQL then return false, nil end
    
    local gangs = MySQL.query.await('SELECT id, name, gang_members FROM gangs', {})
    if gangs then
        for _, gang in ipairs(gangs) do
            if gang.gang_members then
                local success, members = pcall(json.decode, gang.gang_members)
                if success and members and type(members) == 'table' then
                    if members[citizenid] then
                        return true, gang.id
                    end
                end
            end
        end
    end
    
    return false, nil
end

-- Active invites table: { inviteId = { gangName, gangId, inviterCitizenid, inviterName, targetCitizenid, timestamp, status } }
local ActiveInvites = {}
local InviteIdCounter = 0

-- Clean up expired invites (runs every 30 seconds)
CreateThread(function()
    while true do
        Wait(30000) -- Check every 30 seconds
        
        local currentTime = os.time()
        for inviteId, invite in pairs(ActiveInvites) do
            -- Timeout after 180 seconds - mark as timeout and start cooldown
            if invite.status == 'pending' and (currentTime - invite.timestamp) >= 180 then
                invite.status = 'timeout'
                invite.timestamp = currentTime -- Reset timestamp for cooldown period
            end
            
            -- Clean up timeout invites after 180 second cooldown
            if invite.status == 'timeout' and (currentTime - invite.timestamp) >= 180 then
                ActiveInvites[inviteId] = nil
            end
            
            -- Clean up denied invites after 300 second cooldown
            if invite.status == 'denied' and (currentTime - invite.timestamp) >= 300 then
                ActiveInvites[inviteId] = nil
            end
        end
    end
end)

-- Helper function to validate gang name
local function ValidateGangName(name)
    if not name or name == '' then
        return false, 'Gang name cannot be empty'
    end
    
    if #name > 32 then
        return false, 'Gang name must be 32 characters or less'
    end
    
    -- Check for special characters (only allow letters, numbers, and spaces)
    if string.match(name, '[^%w%s]') then
        return false, 'Gang name can only contain letters, numbers, and spaces'
    end
    
    -- Check for leading/trailing spaces
    if string.match(name, '^%s') or string.match(name, '%s$') then
        return false, 'Gang name cannot start or end with a space'
    end
    
    return true, nil
end

-- Helper function to validate and normalize HEX color
local function ValidateAndNormalizeHexColor(hexColor)
    if not hexColor or hexColor == '' then
        return true, 'ffffff' -- Default to white
    end
    
    -- Remove # if present
    hexColor = string.gsub(hexColor, '^#', '')
    
    -- Check if it's a valid 6-character HEX code
    if string.match(hexColor, '^[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]$') then
        return true, string.upper(hexColor)
    end
    
    return false, 'Invalid HEX color code. Must be 6 hexadecimal characters (e.g., FF0000 or #FF0000)'
end

-- Callback: Check if player is staff
QBCore.Functions.CreateCallback('envy_gangscript:isStaff', function(source, cb)
    cb(IsStaff(source))
end)

-- Callback: Get all players (online and offline)
QBCore.Functions.CreateCallback('envy_gangscript:getAllPlayers', function(source, cb)
    if not IsStaff(source) then
        cb({})
        return
    end
    
    -- Check if MySQL is available
    if not MySQL then
        cb({})
        return
    end
    
    local players = {}
    
    -- Get online players
    local onlinePlayers = QBCore.Functions.GetQBPlayers()
    for src, player in pairs(onlinePlayers) do
        local charinfo = player.PlayerData.charinfo
        local name = (charinfo.firstname or '') .. ' ' .. (charinfo.lastname or '')
        players[#players + 1] = {
            citizenid = player.PlayerData.citizenid,
            name = name,
            serverId = src,
            online = true
        }
    end
    
    -- Get offline players from database
    local offlinePlayers = MySQL.query.await('SELECT citizenid, charinfo FROM players', {})
    if offlinePlayers then
        for _, playerData in ipairs(offlinePlayers) do
            -- Skip if already in online players list
            local alreadyAdded = false
            for _, onlinePlayer in ipairs(players) do
                if onlinePlayer.citizenid == playerData.citizenid then
                    alreadyAdded = true
                    break
                end
            end
            
            if not alreadyAdded and playerData.charinfo then
                local charinfo = json.decode(playerData.charinfo)
                if charinfo then
                    local name = (charinfo.firstname or '') .. ' ' .. (charinfo.lastname or '')
                    players[#players + 1] = {
                        citizenid = playerData.citizenid,
                        name = name,
                        serverId = nil,
                        online = false
                    }
                end
            end
        end
    end
    
    cb(players)
end)

-- Callback: Create gang
QBCore.Functions.CreateCallback('envy_gangscript:createGang', function(source, cb, gangName, ownerCitizenid, gangColor)
    if not IsStaff(source) then
        cb({ success = false, message = 'You do not have permission to create gangs' })
        return
    end
    
    -- Check if MySQL is available
    if not MySQL then
        cb({ success = false, message = 'Database not ready. Please try again.' })
        return
    end
    
    -- Validate gang name
    local isValid, errorMsg = ValidateGangName(gangName)
    if not isValid then
        cb({ success = false, message = errorMsg })
        return
    end
    
    -- Validate and normalize HEX color
    local isValidColor, normalizedColor = ValidateAndNormalizeHexColor(gangColor)
    if not isValidColor then
        cb({ success = false, message = normalizedColor })
        return
    end
    
    -- Check if owner exists
    local ownerPlayer = QBCore.Functions.GetOfflinePlayerByCitizenId(ownerCitizenid)
    if not ownerPlayer then
        -- Try to get from online players
        local found = false
        for src, player in pairs(QBCore.Functions.GetQBPlayers()) do
            if player.PlayerData.citizenid == ownerCitizenid then
                ownerPlayer = player
                found = true
                break
            end
        end
        
        if not found then
            cb({ success = false, message = 'Owner player not found' })
            return
        end
    end
    
    -- Check if gang name already exists (case-insensitive)
    local existingGang = MySQL.single.await('SELECT id FROM gangs WHERE LOWER(name) = LOWER(?)', { gangName })
    if existingGang then
        cb({ success = false, message = 'A gang with this name already exists' })
        return
    end
    
    -- Default gang ranks
    local defaultRanks = {
        { name = 'member', level = 0 },
        { name = 'boss', level = 10 }
    }
    local ranksJson = json.encode(defaultRanks)
    
    -- Get owner's character name
    local ownerName = GetCharacterName(ownerCitizenid)
    
    -- Initialize gang_members with owner as boss
    local gangMembers = {
        [ownerCitizenid] = {
            charname = ownerName,
            rank = 'boss',
            level = 10
        }
    }
    local membersJson = json.encode(gangMembers)
    
    -- Insert gang into database (color stored without #)
    local insertId = MySQL.insert.await('INSERT INTO gangs (name, owner, color, gang_ranks, gang_members) VALUES (?, ?, ?, ?, ?)', { 
        gangName, 
        ownerCitizenid, 
        normalizedColor,
        ranksJson,
        membersJson
    })
    
    if insertId then
        cb({ success = true, message = 'Gang created successfully' })
    else
        cb({ success = false, message = 'Failed to create gang' })
    end
end)

-- Callback: Get all gangs
QBCore.Functions.CreateCallback('envy_gangscript:getAllGangs', function(source, cb)
    if not IsStaff(source) then
        cb({})
        return
    end
    
    -- Check if MySQL is available
    if not MySQL then
        cb({})
        return
    end
    
    local gangs = MySQL.query.await('SELECT id, name, owner, color FROM gangs ORDER BY name ASC', {})
    if not gangs then
        cb({})
        return
    end
    
    local gangsWithNames = {}
    for _, gang in ipairs(gangs) do
        local ownerName = GetCharacterName(gang.owner)
        gangsWithNames[#gangsWithNames + 1] = {
            id = gang.id,
            name = gang.name,
            owner = gang.owner,
            ownerName = ownerName,
            color = gang.color or 'ffffff'
        }
    end
    
    cb(gangsWithNames)
end)

-- Callback: Delete gang
QBCore.Functions.CreateCallback('envy_gangscript:deleteGang', function(source, cb, gangId)
    if not IsStaff(source) then
        cb({ success = false, message = 'You do not have permission to delete gangs' })
        return
    end
    
    -- Check if MySQL is available
    if not MySQL then
        cb({ success = false, message = 'Database not ready. Please try again.' })
        return
    end
    
    if not gangId then
        cb({ success = false, message = 'Invalid gang ID' })
        return
    end
    
    -- Check if gang exists
    local gang = MySQL.single.await('SELECT id, name FROM gangs WHERE id = ?', { gangId })
    if not gang then
        cb({ success = false, message = 'Gang not found' })
        return
    end
    
    -- Delete gang from database
    local result = MySQL.query.await('DELETE FROM gangs WHERE id = ?', { gangId })
    
    if result then
        cb({ success = true, message = 'Gang deleted successfully' })
    else
        cb({ success = false, message = 'Failed to delete gang' })
    end
end)

-- Callback: Update gang
QBCore.Functions.CreateCallback('envy_gangscript:updateGang', function(source, cb, gangId, gangName, ownerCitizenid, gangColor)
    if not IsStaff(source) then
        cb({ success = false, message = 'You do not have permission to update gangs' })
        return
    end
    
    -- Check if MySQL is available
    if not MySQL then
        cb({ success = false, message = 'Database not ready. Please try again.' })
        return
    end
    
    if not gangId then
        cb({ success = false, message = 'Invalid gang ID' })
        return
    end
    
    -- Check if gang exists and get current owner
    local gang = MySQL.single.await('SELECT id, name, owner FROM gangs WHERE id = ?', { gangId })
    if not gang then
        cb({ success = false, message = 'Gang not found' })
        return
    end
    
    local oldOwnerCitizenid = gang.owner
    
    -- Validate gang name
    local isValid, errorMsg = ValidateGangName(gangName)
    if not isValid then
        cb({ success = false, message = errorMsg })
        return
    end
    
    -- Validate and normalize HEX color
    local isValidColor, normalizedColor = ValidateAndNormalizeHexColor(gangColor)
    if not isValidColor then
        cb({ success = false, message = normalizedColor })
        return
    end
    
    -- Check if owner exists
    local ownerPlayer = QBCore.Functions.GetOfflinePlayerByCitizenId(ownerCitizenid)
    if not ownerPlayer then
        -- Try to get from online players
        local found = false
        for src, player in pairs(QBCore.Functions.GetQBPlayers()) do
            if player.PlayerData.citizenid == ownerCitizenid then
                ownerPlayer = player
                found = true
                break
            end
        end
        
        if not found then
            cb({ success = false, message = 'Owner player not found' })
            return
        end
    end
    
    -- Check if gang name already exists (case-insensitive, excluding current gang)
    local existingGang = MySQL.single.await('SELECT id FROM gangs WHERE LOWER(name) = LOWER(?) AND id != ?', { gangName, gangId })
    if existingGang then
        cb({ success = false, message = 'A gang with this name already exists' })
        return
    end
    
    -- Get current gang_members
    local gangData = MySQL.single.await('SELECT gang_members FROM gangs WHERE id = ?', { gangId })
    local members = {}
    if gangData and gangData.gang_members then
        local success, decodedMembers = pcall(json.decode, gangData.gang_members)
        if success and decodedMembers and type(decodedMembers) == 'table' then
            members = decodedMembers
        end
    end
    
    -- Handle owner change if owner changed
    if oldOwnerCitizenid ~= ownerCitizenid then
        -- Get new owner's character name
        local newOwnerName = GetCharacterName(ownerCitizenid)
        
        -- Update new owner to boss in gang_members
        if not members[ownerCitizenid] then
            -- New owner not in gang, add them
            members[ownerCitizenid] = {
                charname = newOwnerName,
                rank = 'boss',
                level = 10
            }
        else
            -- New owner already in gang, update their rank and name
            members[ownerCitizenid].charname = newOwnerName
            members[ownerCitizenid].rank = 'boss'
            members[ownerCitizenid].level = 10
        end
        
        -- Update old owner to member (if they're still in the gang)
        if members[oldOwnerCitizenid] then
            members[oldOwnerCitizenid].rank = 'member'
            members[oldOwnerCitizenid].level = 0
        end
    end
    
    -- Update gang in database (color stored without #)
    local membersJson = json.encode(members)
    local result = MySQL.query.await('UPDATE gangs SET name = ?, owner = ?, color = ?, gang_members = ? WHERE id = ?', { 
        gangName, 
        ownerCitizenid, 
        normalizedColor, 
        membersJson,
        gangId 
    })
    
    if result then
        cb({ success = true, message = 'Gang updated successfully' })
    else
        cb({ success = false, message = 'Failed to update gang' })
    end
end)

-- Callback: Check if player is a gang leader
QBCore.Functions.CreateCallback('envy_gangscript:isGangLeader', function(source, cb)
    local isLeader = IsGangLeader(source)
    cb(isLeader)
end)

-- Callback: Get player's gang info
QBCore.Functions.CreateCallback('envy_gangscript:getPlayerGang', function(source, cb)
    local gangData = GetPlayerGang(source)
    if not gangData then
        cb(nil)
        return
    end
    
    cb({
        id = gangData.id,
        name = gangData.name,
        color = gangData.color,
        isLeader = gangData.memberData and gangData.memberData.rank == 'boss' and gangData.memberData.level == 10
    })
end)

-- Callback: Get online players not in gangs (for inviting)
QBCore.Functions.CreateCallback('envy_gangscript:getOnlinePlayersForInvite', function(source, cb)
    if not MySQL then
        print('[envy_gangscript] getOnlinePlayersForInvite: MySQL not available')
        cb({})
        return
    end
    
    -- Check if inviter is a gang leader
    if not IsGangLeader(source) then
        print('[envy_gangscript] getOnlinePlayersForInvite: Player is not a gang leader')
        cb({})
        return
    end
    
    local players = {}
    local onlinePlayers = QBCore.Functions.GetQBPlayers()
    local totalOnline = 0
    local checkedPlayers = 0
    
    -- Get all gang members from all gangs
    local allGangMembers = {}
    local gangs = MySQL.query.await('SELECT gang_members FROM gangs', {})
    if gangs then
        for _, gang in ipairs(gangs) do
            if gang.gang_members then
                local success, members = pcall(json.decode, gang.gang_members)
                if success and members and type(members) == 'table' then
                    for citizenid, _ in pairs(members) do
                        allGangMembers[citizenid] = true
                    end
                end
            end
        end
    end
    
    for src, player in pairs(onlinePlayers) do
        totalOnline = totalOnline + 1
        -- Skip self
        if src == source then goto continue end
        
        checkedPlayers = checkedPlayers + 1
        
        -- Check if player is in any gang (using gang_members)
        local isNotInGang = not allGangMembers[player.PlayerData.citizenid]
        
        -- Only include players not in a gang
        if isNotInGang then
            local charinfo = player.PlayerData.charinfo
            local name = (charinfo.firstname or '') .. ' ' .. (charinfo.lastname or '')
            
            -- Check if player has a pending invite
            local hasPendingInvite = false
            for _, invite in pairs(ActiveInvites) do
                if invite.targetCitizenid == player.PlayerData.citizenid and invite.status == 'pending' then
                    hasPendingInvite = true
                    break
                end
            end
            
            if not hasPendingInvite then
                players[#players + 1] = {
                    citizenid = player.PlayerData.citizenid,
                    name = name,
                    serverId = src,
                    online = true
                }
            end
        end
        
        ::continue::
    end
    
    print(string.format('[envy_gangscript] getOnlinePlayersForInvite: Total online: %d, Checked: %d, Available: %d', totalOnline, checkedPlayers, #players))
    cb(players)
end)

-- Callback: Invite a player to gang
QBCore.Functions.CreateCallback('envy_gangscript:invitePlayer', function(source, cb, targetCitizenid)
    if not MySQL then
        cb({ success = false, message = 'Database not available' })
        return
    end
    
    -- Check if inviter is a gang leader
    if not IsGangLeader(source) then
        cb({ success = false, message = 'You must be a gang leader to invite players' })
        return
    end
    
    local inviterPlayer = QBCore.Functions.GetPlayer(source)
    if not inviterPlayer then
        cb({ success = false, message = 'Player not found' })
        return
    end
    
    local inviterGang = GetPlayerGang(source)
    if not inviterGang then
        cb({ success = false, message = 'You are not in a gang' })
        return
    end
    
    -- Get gang info from database
    local gangInfo = MySQL.single.await('SELECT id, name, color FROM gangs WHERE name = ?', { inviterGang.name })
    if not gangInfo then
        cb({ success = false, message = 'Gang not found in database' })
        return
    end
    
    -- Check if target player is online
    local targetPlayer = nil
    local onlinePlayers = QBCore.Functions.GetQBPlayers()
    for src, player in pairs(onlinePlayers) do
        if player.PlayerData.citizenid == targetCitizenid then
            targetPlayer = player
            break
        end
    end
    
    if not targetPlayer then
        cb({ success = false, message = 'Target player is not online' })
        return
    end
    
    -- Check if target player is already in a gang
    local targetGang = targetPlayer.PlayerData.gang
    if targetGang and targetGang.name and targetGang.name ~= 'none' then
        cb({ success = false, message = 'Player is already in a gang' })
        return
    end
    
    -- Check if target player already has a pending invite
    for _, invite in pairs(ActiveInvites) do
        if invite.targetCitizenid == targetCitizenid and invite.status == 'pending' then
            cb({ success = false, message = 'Player already has a pending invite' })
            return
        end
    end
    
    -- Check if target player is on cooldown
    local currentTime = os.time()
    for _, invite in pairs(ActiveInvites) do
        if invite.targetCitizenid == targetCitizenid then
            -- Check for denied cooldown (300 seconds)
            if invite.status == 'denied' then
                local timeSinceDeny = currentTime - invite.timestamp
                if timeSinceDeny < 300 then
                    local remainingTime = 300 - timeSinceDeny
                    cb({ success = false, message = string.format('Player is on cooldown. Try again in %d seconds', remainingTime) })
                    return
                end
            end
            
            -- Check for timeout cooldown (180 seconds)
            if invite.status == 'timeout' then
                local timeSinceTimeout = currentTime - invite.timestamp
                if timeSinceTimeout < 180 then
                    local remainingTime = 180 - timeSinceTimeout
                    cb({ success = false, message = string.format('Player is on cooldown. Try again in %d seconds', remainingTime) })
                    return
                end
            end
        end
    end
    
    -- Create invite
    InviteIdCounter = InviteIdCounter + 1
    local inviteId = InviteIdCounter
    
    local inviterCharinfo = inviterPlayer.PlayerData.charinfo
    local inviterName = (inviterCharinfo.firstname or '') .. ' ' .. (inviterCharinfo.lastname or '')
    
    local targetCharinfo = targetPlayer.PlayerData.charinfo
    local targetName = (targetCharinfo.firstname or '') .. ' ' .. (targetCharinfo.lastname or '')
    
    ActiveInvites[inviteId] = {
        inviteId = inviteId,
        gangName = gangInfo.name,
        gangId = gangInfo.id,
        gangColor = gangInfo.color,
        inviterCitizenid = inviterPlayer.PlayerData.citizenid,
        inviterName = inviterName,
        targetCitizenid = targetCitizenid,
        targetName = targetName,
        timestamp = os.time(),
        status = 'pending'
    }
    
    -- Send invite to target player
    TriggerClientEvent('envy_gangscript:receiveInvite', targetPlayer.PlayerData.source, {
        inviteId = inviteId,
        gangName = gangInfo.name,
        gangColor = gangInfo.color,
        inviterName = inviterName
    })
    
    cb({ success = true, message = string.format('Invite sent to %s', targetName) })
end)

-- Callback: Accept invite
QBCore.Functions.CreateCallback('envy_gangscript:acceptInvite', function(source, cb, inviteId)
    if not MySQL then
        cb({ success = false, message = 'Database not available' })
        return
    end
    
    local invite = ActiveInvites[inviteId]
    if not invite then
        cb({ success = false, message = 'Invite not found or expired' })
        return
    end
    
    if invite.status ~= 'pending' then
        cb({ success = false, message = 'Invite is no longer valid' })
        return
    end
    
    -- Verify this invite is for this player
    local player = QBCore.Functions.GetPlayer(source)
    if not player or player.PlayerData.citizenid ~= invite.targetCitizenid then
        cb({ success = false, message = 'This invite is not for you' })
        return
    end
    
    -- Check if player is already in a gang (using gang_members)
    local isInGang, existingGangId = IsPlayerInGang(player.PlayerData.citizenid)
    if isInGang then
        cb({ success = false, message = 'You are already in a gang' })
        ActiveInvites[inviteId] = nil
        return
    end
    
    -- Get gang data
    local gang = MySQL.single.await('SELECT id, gang_members FROM gangs WHERE id = ?', { invite.gangId })
    if not gang then
        cb({ success = false, message = 'Gang not found' })
        ActiveInvites[inviteId] = nil
        return
    end
    
    -- Decode existing members
    local members = {}
    if gang.gang_members then
        local success, decodedMembers = pcall(json.decode, gang.gang_members)
        if success and decodedMembers and type(decodedMembers) == 'table' then
            members = decodedMembers
        end
    end
    
    -- Get player's character name
    local charinfo = player.PlayerData.charinfo
    local playerName = (charinfo.firstname or '') .. ' ' .. (charinfo.lastname or '')
    
    -- Add new member
    members[player.PlayerData.citizenid] = {
        charname = playerName,
        rank = 'member',
        level = 0
    }
    
    -- Update gang_members in database
    local membersJson = json.encode(members)
    MySQL.query.await('UPDATE gangs SET gang_members = ? WHERE id = ?', { membersJson, invite.gangId })
    
    -- Mark invite as accepted
    ActiveInvites[inviteId].status = 'accepted'
    
    -- Notify inviter using UI notification system
    local inviterPlayer = QBCore.Functions.GetPlayerByCitizenId(invite.inviterCitizenid)
    if inviterPlayer then
        TriggerClientEvent('envy_gangscript:showNotification', inviterPlayer.PlayerData.source, string.format('%s accepted your gang invite', invite.targetName), 'success')
    end
    
    cb({ success = true, message = string.format('You joined %s!', invite.gangName) })
    
    -- Clean up invite after a short delay
    CreateThread(function()
        Wait(5000)
        ActiveInvites[inviteId] = nil
    end)
end)

-- Callback: Deny invite
QBCore.Functions.CreateCallback('envy_gangscript:denyInvite', function(source, cb, inviteId)
    local invite = ActiveInvites[inviteId]
    if not invite then
        cb({ success = false, message = 'Invite not found or expired' })
        return
    end
    
    if invite.status ~= 'pending' then
        cb({ success = false, message = 'Invite is no longer valid' })
        return
    end
    
    -- Verify this invite is for this player
    local player = QBCore.Functions.GetPlayer(source)
    if not player or player.PlayerData.citizenid ~= invite.targetCitizenid then
        cb({ success = false, message = 'This invite is not for you' })
        return
    end
    
    -- Mark invite as denied (will be cleaned up after 300 second cooldown period)
    ActiveInvites[inviteId].status = 'denied'
    ActiveInvites[inviteId].timestamp = os.time() -- Update timestamp for cooldown
    
    -- Notify inviter using UI notification system
    local inviterPlayer = QBCore.Functions.GetPlayerByCitizenId(invite.inviterCitizenid)
    if inviterPlayer then
        TriggerClientEvent('envy_gangscript:showNotification', inviterPlayer.PlayerData.source, string.format('%s declined your gang invite', invite.targetName), 'error')
    end
    
    cb({ success = true, message = 'Invite declined' })
    
    -- Note: Cleanup is handled by the cleanup thread after 300 seconds
end)

-- Callback: Get gang roster
QBCore.Functions.CreateCallback('envy_gangscript:getGangRoster', function(source, cb)
    if not MySQL then
        cb({ success = false, message = 'Database not available' })
        return
    end
    
    -- Check if player is a gang leader
    if not IsGangLeader(source) then
        cb({ success = false, message = 'You must be a gang leader to view the roster' })
        return
    end
    
    local player = QBCore.Functions.GetPlayer(source)
    if not player then
        cb({ success = false, message = 'Player not found' })
        return
    end
    
    local citizenid = player.PlayerData.citizenid
    
    -- Find the gang the player is leader of
    local gangs = MySQL.query.await('SELECT id, gang_members, gang_ranks FROM gangs', {})
    if not gangs then
        cb({ success = false, message = 'Failed to retrieve gangs' })
        return
    end
    
    local playerGang = nil
    for _, gang in ipairs(gangs) do
        if gang.gang_members then
            local success, members = pcall(json.decode, gang.gang_members)
            if success and members and type(members) == 'table' then
                local memberData = members[citizenid]
                if memberData and memberData.rank == 'boss' and memberData.level == 10 then
                    playerGang = gang
                    break
                end
            end
        end
    end
    
    if not playerGang then
        cb({ success = false, message = 'Gang not found' })
        return
    end
    
    -- Decode members and ranks
    local members = {}
    if playerGang.gang_members then
        local success, decodedMembers = pcall(json.decode, playerGang.gang_members)
        if success and decodedMembers and type(decodedMembers) == 'table' then
            members = decodedMembers
        end
    end
    
    local ranks = {}
    if playerGang.gang_ranks then
        local success, decodedRanks = pcall(json.decode, playerGang.gang_ranks)
        if success and decodedRanks and type(decodedRanks) == 'table' then
            ranks = decodedRanks
        end
    end
    
    -- Build roster list
    local roster = {}
    for memberCitizenid, memberData in pairs(members) do
        local rankName = 'Unknown'
        -- Search through ranks array to find matching rank
        if type(ranks) == 'table' then
            for _, rankData in ipairs(ranks) do
                if rankData.name == memberData.rank then
                    -- Capitalize first letter
                    rankName = string.upper(string.sub(rankData.name, 1, 1)) .. string.sub(rankData.name, 2)
                    break
                end
            end
        end
        -- Fallback to memberData.rank if not found (capitalize first letter)
        if rankName == 'Unknown' and memberData.rank then
            rankName = string.upper(string.sub(memberData.rank, 1, 1)) .. string.sub(memberData.rank, 2)
        end
        
        -- Check if player is online
        local isOnline = false
        for src, onlinePlayer in pairs(QBCore.Functions.GetQBPlayers()) do
            if onlinePlayer.PlayerData.citizenid == memberCitizenid then
                isOnline = true
                break
            end
        end
        
        roster[#roster + 1] = {
            citizenid = memberCitizenid,
            charname = memberData.charname or 'Unknown',
            rank = rankName,
            level = memberData.level or 0,
            isLeader = memberData.rank == 'boss' and memberData.level == 10,
            isOnline = isOnline
        }
    end
    
    -- Sort roster: by level (descending), then alphabetically by character name
    table.sort(roster, function(a, b)
        if a.level ~= b.level then
            return a.level > b.level
        end
        return a.charname < b.charname
    end)
    
    cb({ success = true, roster = roster })
end)

-- Callback: Leave gang
QBCore.Functions.CreateCallback('envy_gangscript:leaveGang', function(source, cb)
    if not MySQL then
        cb({ success = false, message = 'Database not available' })
        return
    end
    
    local player = QBCore.Functions.GetPlayer(source)
    if not player then
        cb({ success = false, message = 'Player not found' })
        return
    end
    
    local citizenid = player.PlayerData.citizenid
    
    -- Find the gang the player is in
    local gangs = MySQL.query.await('SELECT id, name, owner, gang_members FROM gangs', {})
    if not gangs then
        cb({ success = false, message = 'Failed to retrieve gangs' })
        return
    end
    
    local playerGang = nil
    for _, gang in ipairs(gangs) do
        if gang.gang_members then
            local success, members = pcall(json.decode, gang.gang_members)
            if success and members and type(members) == 'table' then
                if members[citizenid] then
                    playerGang = gang
                    break
                end
            end
        end
    end
    
    if not playerGang then
        cb({ success = false, message = 'You are not in a gang' })
        return
    end
    
    -- Decode members
    local members = {}
    if playerGang.gang_members then
        local success, decodedMembers = pcall(json.decode, playerGang.gang_members)
        if success and decodedMembers and type(decodedMembers) == 'table' then
            members = decodedMembers
        end
    end
    
    local memberData = members[citizenid]
    if not memberData then
        cb({ success = false, message = 'Member data not found' })
        return
    end
    
    local isLeader = memberData.rank == 'boss' and memberData.level == 10
    local playerName = memberData.charname or 'Unknown'
    
    -- Get gang leader citizenid for notification
    local gangLeaderCitizenid = playerGang.owner
    
    -- Count total members
    local memberCount = 0
    for _ in pairs(members) do
        memberCount = memberCount + 1
    end
    
    -- If leader is the only member, delete the gang
    if isLeader and memberCount == 1 then
        local deleteResult = MySQL.query.await('DELETE FROM gangs WHERE id = ?', { playerGang.id })
        if deleteResult then
            cb({ success = true, message = 'Gang deleted (you were the only member)' })
            return
        else
            cb({ success = false, message = 'Failed to delete gang' })
            return
        end
    end
    
    -- If leader, assign new leader
    if isLeader then
        -- Find next highest level member (alphabetically by name if tied)
        local newLeaderCitizenid = nil
        local newLeaderLevel = -1
        local newLeaderName = nil
        
        for memberCitizenid, memberMemberData in pairs(members) do
            if memberCitizenid ~= citizenid then
                if memberMemberData.level > newLeaderLevel or 
                   (memberMemberData.level == newLeaderLevel and 
                    (not newLeaderName or memberMemberData.charname < newLeaderName)) then
                    newLeaderCitizenid = memberCitizenid
                    newLeaderLevel = memberMemberData.level
                    newLeaderName = memberMemberData.charname
                end
            end
        end
        
        if newLeaderCitizenid then
            -- Update new leader to boss
            members[newLeaderCitizenid].rank = 'boss'
            members[newLeaderCitizenid].level = 10
            
            -- Update owner in database
            MySQL.query.await('UPDATE gangs SET owner = ? WHERE id = ?', { newLeaderCitizenid, playerGang.id })
        end
    end
    
    -- Remove player from members
    members[citizenid] = nil
    
    -- Update gang_members in database
    local membersJson = json.encode(members)
    local updateResult = MySQL.query.await('UPDATE gangs SET gang_members = ? WHERE id = ?', { membersJson, playerGang.id })
    
    if updateResult then
        -- Notify gang leader if they're online and the leaving player is not the leader
        if not isLeader and gangLeaderCitizenid then
            local leaderPlayer = QBCore.Functions.GetPlayerByCitizenId(gangLeaderCitizenid)
            if leaderPlayer then
                TriggerClientEvent('envy_gangscript:showNotification', leaderPlayer.PlayerData.source, 
                    string.format('%s has left %s', playerName, playerGang.name), 'warning', 'Member Left Gang')
            end
        end
        
        cb({ success = true, message = 'You have left the gang' })
    else
        cb({ success = false, message = 'Failed to update gang' })
    end
end)

-- Callback: Kick player from gang
QBCore.Functions.CreateCallback('envy_gangscript:kickPlayer', function(source, cb, targetCitizenid)
    if not MySQL then
        cb({ success = false, message = 'Database not available' })
        return
    end
    
    -- Check if player is a gang leader
    if not IsGangLeader(source) then
        cb({ success = false, message = 'You must be a gang leader to kick players' })
        return
    end
    
    local player = QBCore.Functions.GetPlayer(source)
    if not player then
        cb({ success = false, message = 'Player not found' })
        return
    end
    
    local leaderCitizenid = player.PlayerData.citizenid
    
    if leaderCitizenid == targetCitizenid then
        cb({ success = false, message = 'You cannot kick yourself' })
        return
    end
    
    -- Find the gang
    local gangs = MySQL.query.await('SELECT id, name, gang_members FROM gangs', {})
    if not gangs then
        cb({ success = false, message = 'Failed to retrieve gangs' })
        return
    end
    
    local playerGang = nil
    for _, gang in ipairs(gangs) do
        if gang.gang_members then
            local success, members = pcall(json.decode, gang.gang_members)
            if success and members and type(members) == 'table' then
                local memberData = members[leaderCitizenid]
                if memberData and memberData.rank == 'boss' and memberData.level == 10 then
                    playerGang = gang
                    break
                end
            end
        end
    end
    
    if not playerGang then
        cb({ success = false, message = 'Gang not found' })
        return
    end
    
    -- Decode members
    local members = {}
    if playerGang.gang_members then
        local success, decodedMembers = pcall(json.decode, playerGang.gang_members)
        if success and decodedMembers and type(decodedMembers) == 'table' then
            members = decodedMembers
        end
    end
    
    -- Check if target is in the gang
    if not members[targetCitizenid] then
        cb({ success = false, message = 'Player is not in your gang' })
        return
    end
    
    -- Check if target is the leader
    local targetData = members[targetCitizenid]
    if targetData.rank == 'boss' and targetData.level == 10 then
        cb({ success = false, message = 'You cannot kick the gang leader' })
        return
    end
    
    -- Get target player's character name for notification
    local targetName = targetData.charname or 'Unknown'
    
    -- Remove player from members
    members[targetCitizenid] = nil
    
    -- Update gang_members in database
    local membersJson = json.encode(members)
    local updateResult = MySQL.query.await('UPDATE gangs SET gang_members = ? WHERE id = ?', { membersJson, playerGang.id })
    
    if updateResult then
        -- Notify kicked player if they're online
        local targetPlayer = QBCore.Functions.GetPlayerByCitizenId(targetCitizenid)
        if targetPlayer then
            TriggerClientEvent('envy_gangscript:showNotification', targetPlayer.PlayerData.source, 
                string.format('You have been kicked from %s', playerGang.name), 'error', 'Kicked from Gang')
        end
        
        cb({ success = true, message = 'Player has been kicked from the gang' })
    else
        cb({ success = false, message = 'Failed to update gang' })
    end
end)

