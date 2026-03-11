export const seo = ({
	title,
	description,
}: {
	title: string;
	description?: string;
}) => {
	const tags = [
		{ title: `${title} | PCEA Kenyatta Rd Parish` },
		{ name: "description", content: description },
	];

	return tags;
};
