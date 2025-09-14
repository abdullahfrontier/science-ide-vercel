import React from 'react'
import {UserOutlined, SettingOutlined, LogoutOutlined, CloseOutlined, DoubleRightOutlined} from '@ant-design/icons'
import {ExperimentOutlined, FileAddOutlined, UserAddOutlined, RadarChartOutlined, CheckSquareOutlined} from '@ant-design/icons'

export type TabKey = 'start-experiment' | 'register-user' | 'register-experiment' | 'lab-feed' | 'design-checker' | 'profile' | 'editor'

export const MenuItems: {key: TabKey; icon: React.ReactNode; label: string}[] = [
	{
		key: 'start-experiment',
		icon: React.createElement(ExperimentOutlined),
		label: 'Start Experiment'
	},
	{
		key: 'register-experiment',
		icon: React.createElement(FileAddOutlined),
		label: 'Create Experiment'
	},
	{
		key: 'register-user',
		icon: React.createElement(UserAddOutlined),
		label: 'Register User'
	},
	{
		key: 'lab-feed',
		icon: React.createElement(RadarChartOutlined),
		label: 'Lab Feed'
	},
	{
		key: 'design-checker',
		icon: React.createElement(CheckSquareOutlined),
		label: 'Verify Protocol'
	},
	{
		key: 'editor',
		icon: React.createElement(CheckSquareOutlined),
		label: 'Editor'
	}
]

export const userMenuItems = [{key: 'profile', icon: React.createElement(UserOutlined), label: 'Profile'}, {key: 'settings', icon: React.createElement(SettingOutlined), label: 'Settings'}, {type: 'divider' as const}, {key: 'logout', icon: React.createElement(LogoutOutlined), label: 'Logout'}]
