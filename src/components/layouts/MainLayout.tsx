import React, {useState, useEffect, ReactNode} from 'react'
import {Layout} from 'antd'
import {useRouter} from 'next/router'
import RegistrationForm from '@/components/auth/RegistrationForm'
import {NewExperimentCard} from '@/components/layouts/NewExperimentCard'
import VerifyProtocolPage from '@/components/layouts/VerifyProtocolPage'
import LabFeedCard from './LabFeedCard'
import {StartExperimentCard} from './StartExperimentCard'
import {Sidebar} from '../common/Sidebar'
import {TabKey} from '../../types/sidebar-types'
import PageHead from '@/components/common/PageHead'
import Profile from '../common/Profile'
import CollaborativeEditor from '../../ide/CollaborativeEditor'

interface MainLayoutProps {
	children?: ReactNode
}

export default function MainLayout({children}: MainLayoutProps) {
	const router = useRouter()
	const queryTab = router.query.tab as TabKey | undefined
	const [activeTab, setActiveTab] = useState<TabKey>(queryTab ?? 'editor')
	const [openSideBar, setOpenSideBar] = useState(false)

	const onMenuClick = ({key}: {key: TabKey}) => {
		setActiveTab(key)
		setOpenSideBar(false)
		router.push(`/?tab=${key}`, undefined, {shallow: true})
	}

	const renderContent = () => {
		if (children) {
			return children
		}
		return (
			<>
				{activeTab === 'register-user' && <RegistrationForm />}
				{activeTab === 'register-experiment' && <NewExperimentCard />}
				{activeTab === 'lab-feed' && <LabFeedCard />}
				{activeTab === 'design-checker' && <VerifyProtocolPage />}
				{activeTab === 'start-experiment' && <StartExperimentCard />}
				{activeTab === 'profile' && <Profile />}
				{activeTab === 'editor' && <CollaborativeEditor />}
			</>
		)
	}

	return (
		<>
			<PageHead />
			<div className="h-screen">
				<Sidebar activeTab={activeTab} onMenuClick={onMenuClick} openSideBar={openSideBar} setOpenSideBar={setOpenSideBar} />
				<div className="flex-1 md:ml-20">
					<Layout className="h-screen">
						<Layout.Content className="p-6">{renderContent()}</Layout.Content>
					</Layout>
				</div>
			</div>
		</>
	)
}
