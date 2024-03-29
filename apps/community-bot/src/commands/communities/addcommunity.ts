import { AuthError } from "fagc-api-wrapper"
import { Command } from "../../base/Command"
import { createPagedEmbed } from "../../utils/functions"

const AddCommunity: Command = {
	name: "addcommunity",
	description: "Add communities to your community filter",
	aliases: ["addcommunities"],
	usage: "[...ids]",
	examples: ["addcommunity XuciBx7", "addcommunity XuciBx7 XuciBx9 XuciBx/"],
	category: "communities",
	requiresRoles: true,
	requiredPermissions: ["setCommunities"],
	requiresApikey: false,
	run: async ({ client, message, args, guildConfig }) => {
		const allCommunities = await client.fagc.communities.fetchAll({})

		// if there are no args, show the current communities and ask for new args
		if (!args.length) {
			const embed = client.createBaseEmbed()
				.setTitle("FAGC Communities")
				.setDescription("All FAGC Communities")
			const fields = await Promise.all(
				allCommunities
					.filter((r) => !guildConfig.trustedCommunities.includes(r.id))
					.map(async (community) => {
						return {
							name: `${community.name} | \`${community.id}\``,
							value: await client.safeGetContactString(community.contact),
							inline: false,
						}
					}),
			)
			createPagedEmbed(fields, embed, message, { maxPageCount: 10 })
			const newIdsMessage = await client.getMessageResponse(
				message,
				`${client.emotes.type} No communities provided. Please provide IDs in a single message, separated with spaces:`,
			)
			if (!newIdsMessage || !newIdsMessage.content)
				return message.channel.send("No IDs were provided")
			args = newIdsMessage.content.split(" ")
		}

		const communitiesToAdd = args
			// check if the community exists
			.filter((id) => Boolean(allCommunities.find((c) => c.id === id)))
			// check if the community is already in the filter
			.filter((id) => !guildConfig.trustedCommunities.includes(id))

		if (!communitiesToAdd.length)
			return message.channel.send("No valid or new communities to add")

		const confirmationEmbed = client.createBaseEmbed()
			.setTitle("FAGC Communities")
			.setDescription("All FAGC Communities")
		const fields = await Promise.all(
			communitiesToAdd.map(async (id) => {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const community = allCommunities.find((c) => c.id === id)!
				return {
					name: `${community.name} | \`${community.id}\``,
					value: await client.safeGetContactString(community.contact),
					inline: false,
				}
			}),
		)
		createPagedEmbed(fields, confirmationEmbed, message, { maxPageCount: 10 })
		const confirm = await client.getConfirmationMessage(
			message,
			"Are you sure you want to add these communities to your communities filters?",
		)
		if (!confirm) return message.channel.send("Adding communities cancelled")

		communitiesToAdd.forEach((id) => {
			guildConfig.trustedCommunities.push(id)
		})
		
		try {
			await client.saveGuildConfig(guildConfig)
			return message.channel.send("Successfully added community filters")
		} catch (e) {
			if (e instanceof AuthError) {
				return message.channel.send(`${client.emotes.warn} Your API key is not recognized by FAGC`)
			}
			throw e
		}
	},
}
export default AddCommunity
