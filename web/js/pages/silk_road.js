/** 丝绸之路介绍：静态图文页（内容源自小程序 silk-road-intro 页面） */
import { esc } from '../ui.js';

const HERO = '/assets/img/silk-road/history.jpg';

const SECTIONS = [
	{
		title: '历史起源',
		text: `丝绸之路起源于公元前2世纪，由西汉时期的张骞出使西域而开辟。这条横跨欧亚大陆的古代商道，东起中国长安（今西安），西至地中海沿岸，全长约7000多公里，是古代东西方文明交流的重要通道。
张骞两次出使西域，历时13年，开辟了连接东西方的陆上丝绸之路，为后来的贸易往来和文化交流奠定了基础。`
	},
	{
		title: '贸易往来',
		text: `丝绸之路是古代最重要的国际贸易通道，促进了东西方商品的流通。
中国输出：丝绸是中国最著名的特产，深受西方贵族喜爱；精美的瓷器在西方被视为奢侈品；茶文化通过丝路传播到世界各地；造纸术的传播促进了文化发展。
西方输入：胡椒、丁香等香料丰富了中国的饮食文化；各种宝石和玉石装饰品；精美的玻璃器皿；良种马匹改善了中国的交通运输。`
	},
	{
		title: '文化交流',
		text: `丝绸之路不仅是贸易通道，更是文化交流的桥梁，促进了东西方文明的融合。
宗教传播：佛教从印度传入中国，对中国文化产生深远影响；伊斯兰教通过丝路传入中国；景教等基督教派别也通过丝路传入。
艺术交流：胡乐、胡舞等西域艺术形式传入中国；佛教壁画艺术在中国得到发展；佛教建筑风格影响中国建筑艺术。
科技传播：造纸术、印刷术、火药、指南针等四大发明传播到西方；东西方天文知识与医学相互交流。`
	},
	{
		title: '重要城市',
		text: `丝绸之路沿线有许多重要的城市，它们见证了东西方文明的交流与融合。
中国境内：长安（今西安）是丝绸之路的起点，汉唐时期的世界大都市；敦煌是重要交通枢纽，莫高窟艺术宝库所在地；吐鲁番为古代西域重镇；喀什是丝路南道的重要城市。
中亚与西亚：撒马尔罕是古代粟特文明的中心；布哈拉是伊斯兰文化的重要城市；巴格达曾为阿拔斯王朝的首都；君士坦丁堡为东罗马帝国的首都。`
	},
	{
		title: '现代意义',
		text: `丝绸之路精神在当代依然具有重要的现实意义，为"一带一路"倡议提供了历史基础和文化支撑。
和平合作：促进不同文明间的对话与理解，推动世界和平与发展，构建人类命运共同体。
开放包容：倡导开放的区域主义，促进贸易投资便利化，加强人文交流合作。
互利共赢：实现共同发展繁荣，促进区域经济一体化。
创新驱动：加强科技创新合作，推动数字丝绸之路建设，促进绿色可持续发展。`
	}
];

const HIGHLIGHTS = [
	{ title: '历史跨度', value: '2000多年', desc: '从汉代到明清的悠久历史' },
	{ title: '地理跨度', value: '7000多公里', desc: '横跨欧亚大陆的漫长距离' },
	{ title: '文明交融', value: '东西方', desc: '促进不同文明的交流融合' },
	{ title: '现代传承', value: '一带一路', desc: '新时代的丝绸之路精神' }
];

export async function render(root) {
	const ps = t => String(t).split(/\n/).filter(s => s.trim() !== '').map(s => '<p>' + esc(s) + '</p>').join('');
	root.innerHTML = `
		<img class="art-hero" src="${HERO}" alt="丝绸之路">
		<div class="art-body">
			<div style="text-align: center;">
				<div style="font-size: 18px; font-weight: 700; color: var(--theme);">丝绸之路介绍</div>
				<div style="margin-top: 4px; font-size: 12px; color: var(--text-grey);">连接东西方 · 传承文明</div>
			</div>
			<img src="${HERO}" alt="" style="margin-top: 12px;">
			${SECTIONS.map(s => `<h2>${esc(s.title)}</h2>${ps(s.text)}`).join('')}
			<h2>丝路之最</h2>
			<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
				${HIGHLIGHTS.map(h => `
					<div style="background: #faf6f5; border-radius: 8px; padding: 12px;">
						<div style="font-size: 15px; font-weight: 700; color: var(--theme);">${esc(h.value)}</div>
						<div style="margin-top: 2px; font-size: 12px; font-weight: 600;">${esc(h.title)}</div>
						<div style="margin-top: 2px; font-size: 11px; color: var(--text-grey);">${esc(h.desc)}</div>
					</div>`).join('')}
			</div>
		</div>
	`;
}
