import { EmbedField, MessageEmbed } from "discord.js";
import { Command } from "../../base/Command";
import { createPagedEmbed } from "../../utils/functions";
import { getConfirmationMessage, getMessageResponse } from "../../utils/responseGetter";
import {Rule} from "fagc-api-types"

const RemoveRules: Command = {
	name: "removerule",
	aliases: [ "removerules" ],
	description: "Removes a rule filter. Please see the [Explanation](https://gist.github.com/oof2win2/370050d3aa1f37947a374287a5e011c4#file-trusted-md)",
	usage: "[...ids]",
	examples: [
		"removerule XuciBx7",
		"removerule XuciBx7 XuciBx9 XuciBx/",
	],
	category: "rules",
	requiresRoles: true,
	requiredPermissions: ["setRules"],
	requiresApikey: false,
	run: async ({client, message, args, guildConfig}) => {
		// if no args provided, ask for rule ids to remove from filters
		const allRules = await client.fagc.rules.fetchAll({})
		if (!args[0]) {

			let embed = new MessageEmbed()
				.setTitle("FAGC Rules")
				.setColor("GREEN")
				.setTimestamp()
				.setAuthor({name: client.config.embeds.author})
				.setFooter({text: client.config.embeds.footer})
				.setDescription("All FAGC Rules")
			const ruleFields = allRules
				// make sure the rules are filtered
				.filter((rule) => guildConfig.ruleFilters.includes(rule.id))
				.sort((a, b) => {
					if (guildConfig.ruleFilters.indexOf(a.id) > guildConfig.ruleFilters.indexOf(b.id)) return 1
					if (guildConfig.ruleFilters.indexOf(a.id) < guildConfig.ruleFilters.indexOf(b.id)) return -1
					return 0
				})
				.map((rule) => {
					return {
						name: `${guildConfig.ruleFilters.indexOf(rule.id) + 1}) ${rule.shortdesc} (\`${rule.id}\`)`,
						value: rule.longdesc,
						inline: false,
					}
				})
			createPagedEmbed(ruleFields, embed, message, { maxPageCount: 5 })
			const newIDsMessage = await getMessageResponse(
				message,
				`${client.emotes.type} No rules provided. Please provide IDs`
			)

			if (!newIDsMessage || !newIDsMessage.content)
				return message.channel.send("No IDs were provided")
			args = newIDsMessage.content.split(" ")
		}

		// check if the rules are in the community's rule filters
		const rules = args
			.map((ruleid) => 
				isNaN(Number(ruleid)) ?
					client.fagc.rules.resolveID(ruleid) :
					// if it is an index in filtered rules, it needs to be resolved
					client.fagc.rules.resolveID(guildConfig.ruleFilters[Number(ruleid) - 1])
			)
			.filter((r): r is Rule => Boolean(r))
			.filter((r) => guildConfig.ruleFilters.includes(r.id))
		
		// if there are no rules that are already in the community's filters, then exit
		if (!rules.length) return message.channel.send("No valid rules to be removed")

		// otherwise, send a paged embed with the rules to be removed and ask for confirmation
		const embed = new MessageEmbed()
			.setTitle("FAGC Rules")
			.setColor("GREEN")
			.setTimestamp()
			.setAuthor({name: client.config.embeds.author})
			.setFooter({text: client.config.embeds.footer})
			.setDescription("Remove Filtered Rules. [Explanation](https://gist.github.com/oof2win2/370050d3aa1f37947a374287a5e011c4#file-trusted-md)")
		const ruleFields = rules.map((rule) => {
			return {
				name: `${rule.shortdesc} (\`${rule.id}\`)`,
				value: rule.longdesc,
				inline: false,
			}
		})
		createPagedEmbed(ruleFields, embed, message, { maxPageCount: 5 })

		const confirm = await getConfirmationMessage(
			message,
			"Are you sure you want to remove these rules from your rule filters?"
		)
		if (!confirm) return message.channel.send("Removing rules cancelled")

		// remove the rules from the community's filters
		const ruleIDs = rules.map((rule) => rule.id)
		const newRuleFilters = guildConfig.ruleFilters.filter((ruleFilter) => !ruleIDs.includes(ruleFilter))

		// save the community's config
		await client.saveGuildConfig({
			guildId: message.guild.id,
			ruleFilters: newRuleFilters,
			apikey: guildConfig.apiKey || undefined,
		})

		return message.channel.send("Successfully removed specified filtered rules")
	}
}
export default RemoveRules