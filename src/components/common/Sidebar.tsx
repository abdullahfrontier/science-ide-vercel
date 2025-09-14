import React from 'react'
import {useRouter} from 'next/router'
import {Menu, Tooltip, Avatar, Dropdown} from 'antd'
import {UserOutlined, CloseOutlined, DoubleRightOutlined} from '@ant-design/icons'
import {TabKey, MenuItems, userMenuItems} from '../../types/sidebar-types'
import {useAppDispatch, useAppSelector} from '@/store/hooks'
import {logout} from '@/store/thunks/authThunk'
import {persistor} from '@/store'

interface SidebarProps {
	activeTab: TabKey
	onMenuClick: (info: {key: TabKey}) => void
	openSideBar: boolean
	setOpenSideBar: (open: boolean) => void
}

export const Sidebar: React.FC<SidebarProps> = ({activeTab, onMenuClick, openSideBar, setOpenSideBar}) => {
	const dispatch = useAppDispatch()
	const {user} = useAppSelector((state) => state.auth)
	const router = useRouter()

	return (
		<div className={`fixed left-0 top-0 w-20 h-screen bg-white border-r border-border z-50 transition-transform -translate-x-full md:translate-x-0 ${openSideBar ? 'translate-x-0' : ''}`}>
			<div className="h-full flex flex-col relative">
				<div className={`absolute top-[5.6rem] w-8 h-8 ${openSideBar ? '-right-4' : '-right-6'} z-10 rounded-full bg-black flex items-center justify-center md:hidden cursor-pointer`} onClick={() => setOpenSideBar(!openSideBar)}>
					{!openSideBar ? <DoubleRightOutlined className="text-white fill-white" /> : <CloseOutlined className="text-white fill-white" />}
				</div>

				<div className="py-4 px-2 border-b border-border">
					<div className="flex flex-col items-center">
						<div className="text-2xl font-bold text-primary mb-1">🧪</div>
						<div className="text-xs font-bold text-center leading-tight">
							<div className="text-foreground">Eureka</div>
							<div className="text-muted-foreground text-[10px]">Science done better</div>
						</div>
					</div>
				</div>

				<div className="flex-1 py-4">
					<Menu
						mode="inline"
						selectedKeys={[activeTab]}
						onClick={(info) => onMenuClick(info as {key: TabKey})}
						className="border-none"
						style={{backgroundColor: 'transparent'}}
						items={MenuItems.map(({key, icon, label}) => ({
							key,
							icon: (
								<Tooltip title={label} placement="right">
									{icon}
								</Tooltip>
							),
							label: ''
						}))}
					/>
				</div>

				<div className="border-t border-border p-2">
					{user ? (
						<Tooltip title={`${user.name} - ${user.email}`} placement="right">
							<Dropdown
								menu={{
									items: userMenuItems,
									onClick: async ({key}) => {
										if (key == 'profile') {
											onMenuClick({key: 'profile' as TabKey})
										} else if (key === 'settings') {
										} else {
											setOpenSideBar(false)
											if (key === 'logout') {
												await dispatch(logout()).unwrap()
												await persistor.purge()
												router.push('/login')
											}
										}
									}
								}}
								placement="topRight"
								trigger={['click']}>
								<div className="w-16 h-12 flex items-center justify-center cursor-pointer hover:bg-secondary rounded-lg transition-colors">
									<Avatar size="small" icon={<UserOutlined />} />
								</div>
							</Dropdown>
						</Tooltip>
					) : (
						<Tooltip title="Login" placement="right">
							<div className="w-16 h-12 flex items-center justify-center cursor-pointer hover:bg-secondary rounded-lg transition-colors" onClick={() => (window.location.href = '/login')}>
								<UserOutlined style={{fontSize: '18px'}} />
							</div>
						</Tooltip>
					)}
				</div>
			</div>
		</div>
	)
}
