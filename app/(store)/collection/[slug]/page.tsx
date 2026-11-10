import CollectionDetailPage, {
  generateMetadata as generateDetailMetadata,
} from "../../collections/[slug]/page";

export const dynamic = "force-dynamic";

export const generateMetadata = generateDetailMetadata;
export default CollectionDetailPage;
