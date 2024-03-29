import { Command } from "../../base/Command"
import { Role } from "discord.js"
import { GuildConfig } from "fagc-api-types"
import { AuthError } from "fagc-api-wrapper"

const SetPermissions: Command = {
	name: "setpermissions",
	aliases: ["setperms", "setperms", "setperms", "setperms"],
	description: "Set the permissions for a role",
	usage: "[setting] [permission] [role]",
	examples: [
		"setperms",
		"setperms reports",
		"setperms reports 429696038266208258",
	],
	category: "config",
	requiresRoles: true,
	requiredPermissions: ["setConfig"],
	requiresApikey: false,
	run: async ({ client, message, args, guildConfig }) => {
		const permStrings = [
			"reports",
			"webhooks",
			"setConfig",
			"setCategories",
			"setCommunities",
		]

		if (!args[0]) {
			const permTypes = Object.keys(GuildConfig._def.shape().roles._def.shape())
			const permissions: Record<keyof GuildConfig["roles"], Role | undefined> = {
				reports: undefined,
				webhooks: undefined,
				setConfig: undefined,
				setCategories: undefined,
				setCommunities: undefined,
			}

			// set all perms at once
			message.channel.send("Process of setting roles has started.")

			for (const permType of permTypes) {
				const permMessage = await client.getMessageResponse(
					message,
					`Type in the ID or ping the role for the ${permStrings[permTypes.indexOf(permType)]} permission`,
				)
				if (!permMessage) return message.channel.send(`${client.emotes.warn} No permission was sent`)
				const permRole = permMessage?.mentions.roles.first() ||
					message.guild.roles.cache.get(
						permMessage.content?.split(" ")[0] || "",
					)
				if (!permRole)  message.channel.send(
					`${client.emotes.warn} \`${
						permMessage.content?.split(" ")[0]
					}\` is not a valid role`,
				)
				permissions[permType] = permRole

			}

			const embed = client.createBaseEmbed()
				.setTitle("FAGC Role Config")
				.setDescription("Your FAGC Role Configuration")
				.addFields([
					{ name: "Reports Management", value: `<@&${permissions.reports?.id}>` },
					{ name: "Webhook Management", value: `<@&${permissions.webhooks?.id}>` },
					{ name: "Config Management", value: `<@&${permissions.setConfig?.id}>` },
					{ name: "Category Management", value: `<@&${permissions.setCategories?.id}>` },
					{
						name: "Communities Management",
						value: `<@&${permissions.setCommunities?.id}>`,
					},
				])
			message.channel.send({
				embeds: [embed],
			})
			const confirmation = await client.getConfirmationMessage(
				message,
				"Are you sure you want these settings applied?",
			)
			if (!confirmation)
				return message.channel.send("Role configuration cancelled")

			try {
				await client.saveGuildConfig({
					...guildConfig,
					roles: {
						setCategories: permissions.setCategories?.id || "",
						setCommunities: permissions.setCommunities?.id || "",
						setConfig: permissions.setConfig?.id || "",
						reports: permissions.reports?.id || "",
						webhooks: permissions.webhooks?.id || "",
					},
				})
				return message.channel.send(
					`${client.emotes.success} Successfully set all permissions!`,
				)
			} catch (e) {
				if (e instanceof AuthError) {
					return message.channel.send(`${client.emotes.warn} Your API key is not recognized by FAGC`)
				}
				throw e
			}
		}

		// the role type has been provided, so setting only one role
		const permType = args[0]
		if (!permStrings.includes(permType))
			return message.reply(
				`${client.emotes.warn} \`${permType}\` is not a valid permission type`,
			)
		
		let role: Role
		if (!args[1]) {
			// id wasnt provided so need to ask
			const roleMessage = await client.getMessageResponse(
				message,
				"Type in the ID or ping the role for the permission",
			)
			const tmpRole =
				roleMessage?.mentions.roles.first() ||
				message.guild.roles.cache.get(roleMessage?.content?.split(" ")[0] || "")
			if (!tmpRole)
				return message.channel.send(
					`${client.emotes.warn} \`${
						roleMessage?.content?.split(" ")[0]
					}\` is not a valid role`,
				)
			role = tmpRole
		} else {
			const tmpRole =  message.mentions.roles.first() || message.guild.roles.cache.get(args[1])
			if (!tmpRole) return message.channel.send(`${client.emotes.warn} \`${args[1]}\` is not a valid role`)
			role = tmpRole
		}
		const confirmation = await client.getConfirmationMessage(
			message,
			`Are you sure you want to set the ${permType} permission to ${role.name}?`,
		)
		if (!confirmation)
			return message.channel.send("Role configuration cancelled")
		
		try {
			await client.saveGuildConfig({
				guildId: message.guild.id,
				// this works but just needs to have the right types, maybe a SetGuilConfig type from fagc-api-types
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				roles: {
					[permType]: role.id,
				},
			})
			return message.channel.send(
				`${client.emotes.success} Successfully set the ${permType} permission to ${role.name}!`,
			)
		} catch (e) {
			if (e instanceof AuthError) {
				return message.channel.send(`${client.emotes.warn} Your API key is not recognized by FAGC`)
			}
			throw e
		}
	},
}

export default SetPermissions
