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
                    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
                    PRIMARY KEY (`id`),
                    UNIQUE KEY `name` (`name`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ]])
            
            -- Add color column if it doesn't exist (for existing tables)
            -- Check if column exists, if not, add it
            local columnExists = MySQL.single.await([[
                SELECT COUNT(*) as count 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'gangs' 
                AND COLUMN_NAME = 'color'
            ]], {})
            
            if not columnExists or columnExists.count == 0 then
                MySQL.query([[
                    ALTER TABLE `gangs` 
                    ADD COLUMN `color` varchar(6) NOT NULL DEFAULT 'ffffff' 
                    AFTER `owner`;
                ]])
            end
        end)
    end
end)

-- Helper function to check if player is staff (admin or god)
local function IsStaff(source)
    return QBCore.Functions.HasPermission(source, 'admin') or QBCore.Functions.HasPermission(source, 'god')
end

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
    
    -- Insert gang into database (color stored without #)
    local insertId = MySQL.insert.await('INSERT INTO gangs (name, owner, color) VALUES (?, ?, ?)', { gangName, ownerCitizenid, normalizedColor })
    
    if insertId then
        cb({ success = true, message = 'Gang created successfully' })
    else
        cb({ success = false, message = 'Failed to create gang' })
    end
end)

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
    
    local gangs = MySQL.query.await('SELECT id, name, owner FROM gangs ORDER BY name ASC', {})
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
            ownerName = ownerName
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

