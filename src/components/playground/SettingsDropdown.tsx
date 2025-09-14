import React from 'react'
import {Dropdown, Button, Space} from 'antd'
import {SettingOutlined, DownOutlined, CheckOutlined} from '@ant-design/icons'
import {useConfig} from '@/hooks/useConfig'

type SettingType = 'inputs' | 'outputs' | 'chat' | 'theme_color' | 'experiment_pane'

type SettingValue = {
	title: string
	type: SettingType | 'separator'
	key: string
}

const settingsDropdown: SettingValue[] = [
	{
		title: 'Show chat',
		type: 'chat',
		key: 'N/A'
	},
	// {
	//   title: "---",
	//   type: "separator",
	//   key: "separator_1",
	// },
	// {
	//   title: "Show video",
	//   type: "outputs",
	//   key: "video",
	// },
	// {
	//   title: "Show audio",
	//   type: "outputs",
	//   key: "audio",
	// },

	{
		title: '---',
		type: 'separator',
		key: 'separator_2'
	},
	{
		title: 'Enable camera',
		type: 'inputs',
		key: 'camera'
	},
	{
		title: 'Enable mic',
		type: 'inputs',
		key: 'mic'
	}
]

const experimentPaneSetting: SettingValue = {
	title: 'Show Experiment Pane',
	type: 'experiment_pane',
	key: 'show_experiment_pane'
}

export const SettingsDropdown = () => {
	const {config, setUserSettings} = useConfig()

	const isEnabled = (setting: SettingValue) => {
		if (setting.type === 'separator' || setting.type === 'theme_color') return false
		if (setting.type === 'chat') {
			return config.settings.chat
		}
		if (setting.type === 'experiment_pane') {
			return config.settings.show_experiment_pane
		}

		if (setting.type === 'inputs') {
			const key = setting.key as 'camera' | 'mic'
			return config.settings.inputs[key]
		} else if (setting.type === 'outputs') {
			const key = setting.key as 'video' | 'audio'
			return config.settings.outputs[key]
		}

		return false
	}

	const toggleSetting = (setting: SettingValue) => {
		if (setting.type === 'separator' || setting.type === 'theme_color') return
		const newValue = !isEnabled(setting)
		const newSettings = {...config.settings}

		if (setting.type === 'chat') {
			newSettings.chat = newValue
		} else if (setting.type === 'experiment_pane') {
			newSettings.show_experiment_pane = newValue
		} else if (setting.type === 'inputs') {
			newSettings.inputs[setting.key as 'camera' | 'mic'] = newValue
		} else if (setting.type === 'outputs') {
			newSettings.outputs[setting.key as 'video' | 'audio'] = newValue
		}
		setUserSettings(newSettings)
	}

	// Create menu items for Ant Design
	const menuItems = [
		...settingsDropdown.map((setting) => {
			if (setting.type === 'separator') {
				return {
					type: 'divider' as const,
					key: setting.key
				}
			}

			return {
				key: setting.key,
				label: (
					<Space>
						{isEnabled(setting) ? <CheckOutlined style={{color: 'var(--primary)'}} /> : <div className="w-3.5 h-3.5 border border-border rounded-full" />}
						{setting.title}
					</Space>
				),
				onClick: () => toggleSetting(setting),
				disabled: setting.type === 'theme_color'
			}
		}),
		...(config.settings.editable
			? [
					{
						type: 'divider' as const,
						key: 'separator_experiment'
					},
					{
						key: experimentPaneSetting.key,
						label: (
							<Space>
								{isEnabled(experimentPaneSetting) ? <CheckOutlined style={{color: 'var(--primary)'}} /> : <div className="w-3.5 h-3.5 border border-border rounded-full" />}
								{experimentPaneSetting.title}
							</Space>
						),
						onClick: () => toggleSetting(experimentPaneSetting)
					}
				]
			: [])
	]

	return (
		<Dropdown menu={{items: menuItems}} trigger={['click']} placement="bottomRight">
			<Button type="default" className="bg-secondary border-border text-secondary-foreground px-[6px] lg:px-[15px]">
				<Space className="gap-1 lg:gap-2">
					<SettingOutlined />
					<span className="hidden lg:block">Settings</span>
					<DownOutlined />
				</Space>
			</Button>
		</Dropdown>
	)
}
