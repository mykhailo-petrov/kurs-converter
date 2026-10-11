import { parsers as babelParsers } from 'prettier/plugins/babel';
import { printers as estreePrinters } from 'prettier/plugins/estree';
import { doc } from 'prettier';

const { hardline, indent, label } = doc.builders;

const MIN_CALLS = 2;

const estreePrinter = estreePrinters.estree;

const isCall = (node) => node?.type === 'CallExpression' || node?.type === 'OptionalCallExpression';
const isMember = (node) =>
	node?.type === 'MemberExpression' || node?.type === 'OptionalMemberExpression';

function getChainInfo(node) {
	let calls = 0;
	let hasArgs = false;
	let hasComments = false;
	let current = node;

	while (isCall(current) || isMember(current)) {
		if (current.comments?.length) hasComments = true;

		if (isCall(current)) {
			calls += 1;
			if (current.arguments.length) hasArgs = true;
			if (current.optional) hasComments = true;
			current = current.callee;
		} else {
			current = current.object;
		}
	}

	return { calls, hasArgs, hasComments, base: current };
}

function shouldBreakChain(node, parent) {
	if (!isCall(node) || !isMember(node.callee)) return false;
	if (isMember(parent) && parent.object === node) return false;

	const { calls, hasArgs, hasComments } = getChainInfo(node);

	return calls >= MIN_CALLS && hasArgs && !hasComments;
}

function printArguments(path, options, print) {
	const { node } = path;
	const callee = node.callee;

	node.callee = { type: 'Identifier', name: '' };
	const printed = estreePrinter.print(path, options, print);
	node.callee = callee;

	return printed;
}

function printMember(path, print) {
	const { node } = path;

	if (node.computed) return [node.optional ? '?.[' : '[', print('property'), ']'];

	return [node.optional ? '?.' : '.', print('property')];
}

function collectLinks(path, options, print, links) {
	const { node } = path;

	if (isCall(node) && isMember(node.callee)) {
		path.call((calleePath) => collectLinks(calleePath, options, print, links), 'callee');
		links.push({ kind: 'call', doc: printArguments(path, options, print) });
		return;
	}

	if (isMember(node)) {
		path.call((objectPath) => collectLinks(objectPath, options, print, links), 'object');
		links.push({ kind: 'member', doc: printMember(path, print) });
		return;
	}

	links.push({ kind: 'base', doc: print(), node });
}

function isFactory(node) {
	if (node.type === 'ThisExpression') return true;

	return node.type === 'Identifier' && /^[A-Z][a-z]/.test(node.name);
}

function printChain(path, options, print) {
	const links = [];
	collectLinks(path, options, print, links);

	const [base, ...rest] = links;
	const firstCallIndex = rest.findIndex((link) => link.kind === 'call');

	let headEnd = Math.max(firstCallIndex - 1, 0);
	if (isFactory(base.node)) headEnd = firstCallIndex + 1;

	const head = [
		base.doc,
		...rest
			.slice(0, headEnd)
			.map((link) => link.doc),
	];
	const groups = [];

	rest
		.slice(headEnd)
		.forEach((link) => {
			const current = groups.at(-1);
			const startsNewGroup =
				!current || (link.kind === 'member' && current.some((item) => item.kind === 'call'));

			if (startsNewGroup) {
				groups.push([link]);
			} else {
				current.push(link);
			}
		});

	if (!groups.length) return estreePrinter.print(path, options, print);

	return label('member-chain', [
		head,
		indent(groups.map((group) => [hardline, ...group.map((link) => link.doc)])),
	]);
}

export const parsers = {
	babel: babelParsers.babel,
};

export const printers = {
	estree: {
		...estreePrinter,
		print(path, options, print, ...rest) {
			if (shouldBreakChain(path.node, path.parent)) return printChain(path, options, print);

			return estreePrinter.print(path, options, print, ...rest);
		},
	},
};
